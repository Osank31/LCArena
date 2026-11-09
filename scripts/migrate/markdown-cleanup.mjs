#!/usr/bin/env node
/**
 * markdown-cleanup.mjs — one-time Markdown cleanup / migration for all existing
 * LCArena problem descriptions.
 *
 * Processes every document in the `problems` collection, normalizes its
 * `description` field through the same canonicalization pipeline used by the
 * backend (normalizeMarkdown), and persists only when the cleaned value differs
 * from the stored value.
 *
 * Safety guarantees:
 *   - Idempotent: safe to re-run; already-processed docs are skipped.
 *   - Backup / reversible: snapshots every document to a backup collection
 *     before writing; `--rollback` restores from the backup.
 *   - Dry run: `--dry-run` logs actions without writing.
 *   - Batches: cursor with batchSize; per-doc updateOne (atomic by doc id).
 *   - Preserves _id and all unrelated fields.
 *   - Only updates when actual changes are required (before/after comparison).
 *   - Retries failed records (--retries with exponential backoff).
 *   - Logs OK / SKIPPED / FAILED per record plus summary counts.
 *
 * Usage:
 *   node scripts/migrate/markdown-cleanup.mjs [--url=<mongo>] [--dry-run]
 *     [--batch-size=100] [--retries=3] [--backup-collection=problems_backup_<ts>]
 *     [--rollback] [--retry-failed] [--failed-file=failed-problems.json]
 *
 * Examples:
 *   # Preview what would change (no writes)
 *   node scripts/migrate/markdown-cleanup.mjs --dry-run
 *
 *   # Run the migration with a backup collection
 *   node scripts/migrate/markdown-cleanup.mjs --backup-collection=problems_backup_20261108
 *
 *   # Rollback a previous backup
 *   node scripts/migrate/markdown-cleanup.mjs --rollback --backup-collection=problems_backup_20261108
 *
 *   # Retry previously failed records
 *   node scripts/migrate/markdown-cleanup.mjs --retry-failed --failed-file=failed-problems.json
 */

import { MongoClient, ObjectId } from 'mongodb';

/* ------------------------------------------------------------------ */
/* Argument parsing                                                   */
/* ------------------------------------------------------------------ */

const args = process.argv.slice(2);
const valueOf = (flag) => {
    const match = args.find((arg) => arg.startsWith(`${flag}=`));
    if (match) return match.slice(flag.length + 1);
    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
        return args[index + 1];
    }
    return undefined;
};

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/migrate/markdown-cleanup.mjs [options]

Options:
  --url=<mongo-url>          MongoDB connection URL (default MONGODB_URL or mongodb://127.0.0.1:27017/lcarena)
  --dry-run                  Log actions without writing to the database
  --batch-size=N             Documents per batch cursor (default 100)
  --retries=N                Retry attempts on transient DB errors (default 3)
  --backup-collection=<name> Backup collection name (default: problems_backup_<timestamp>)
  --rollback                 Restore descriptions from a backup collection instead of migrating
  --retry-failed             Retry records listed in --failed-file
  --failed-file=<path>       File to write/read failed record IDs (default: failed-problems.json)

Examples:
  node scripts/migrate/markdown-cleanup.mjs --dry-run
  node scripts/migrate/markdown-cleanup.mjs --backup-collection=problems_backup_20261108
  node scripts/migrate/markdown-cleanup.mjs --rollback --backup-collection=problems_backup_20261108
  node scripts/migrate/markdown-cleanup.mjs --retry-failed
`);
    process.exit(0);
}

const MONGO_URL =
    valueOf('--url') || process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/lcarena';
const DRY_RUN = args.includes('--dry-run');
const BATCH_SIZE = Math.max(1, Number(valueOf('--batch-size') || 100));
const RETRIES = Math.max(0, Number(valueOf('--retries') || 3));
const ROLLBACK = args.includes('--rollback');
const RETRY_FAILED = args.includes('--retry-failed');
const BACKUP_COLLECTION =
    valueOf('--backup-collection') ||
    `problems_backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const FAILED_FILE = valueOf('--failed-file') || 'failed-problems.json';

/* ------------------------------------------------------------------ */
/* Markdown normalization (mirrors backend src/markdown/normalize.ts) */
/* ------------------------------------------------------------------ */

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(\S*)(\s*.*)$/;

function isFence(line) {
    return FENCE_RE.test(line);
}

/**
 * Normalize raw Markdown into a canonical, clean form.
 *
 *   1. CRLF/CR -> LF
 *   2. Remove trailing whitespace on every line
 *   3. Collapse runs of 3+ consecutive blank lines into a single blank line
 *   4. Strip trailing blank lines at EOF
 *   5. Ensure exactly one trailing newline
 *
 * Fenced code block contents are preserved verbatim (code indentation &
 * formatting untouched).
 */
function normalizeMarkdown(input) {
    if (input == null) return '';

    let text = String(input).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = text.split('\n');
    const out = [];
    let inFence = false;
    let blankRun = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (isFence(line)) {
            if (!inFence) {
                inFence = true;
                out.push(line);
                blankRun = 0;
                continue;
            }
            const marker = line.match(FENCE_RE)[2];
            if (marker.length >= line.match(FENCE_RE)[2].length) {
                inFence = false;
                out.push(line);
                blankRun = 0;
                continue;
            }
        }

        if (inFence) {
            out.push(line);
            blankRun = 0;
            continue;
        }

        const trimmed = line.replace(/[ \t]+$/, '');

        if (trimmed === '') {
            blankRun++;
            if (blankRun > 1) continue; // collapse extra blank lines
            out.push('');
        } else {
            blankRun = 0;
            out.push(trimmed);
        }
    }

    while (out.length > 0 && out[out.length - 1] === '') out.pop();
    return out.join('\n') + (out.length > 0 ? '\n' : '');
}

/* ------------------------------------------------------------------ */
/* Counters / logging                                                 */
/* ------------------------------------------------------------------ */

const counts = { processed: 0, updated: 0, skipped: 0, failed: 0 };
const failures = []; // { id, reason, retries }
const successes = []; // { id, beforeLen, afterLen }

const log = (message) => console.log(`[migrate] ${message}`);
const logOk = (id, before, after) => {
    counts.processed++;
    counts.updated++;
    successes.push({ id, beforeLen: before.length, afterLen: after.length });
    console.log(`[migrate] OK id=${id} before=${before.length} after=${after.length}`);
};
const logSkip = (id, reason = 'no change') => {
    counts.processed++;
    counts.skipped++;
    console.log(`[migrate] SKIP id=${id} (${reason})`);
};
const logFail = (id, reason) => {
    counts.processed++;
    counts.failed++;
    failures.push({ id, reason, retries: 0 });
    console.log(`[migrate] FAIL id=${id} reason=${reason}`);
};

/* ------------------------------------------------------------------ */
/* Retry helper                                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, label) {
    let lastErr;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt < RETRIES) {
                const delay = Math.min(1000 * 2 ** attempt, 30000);
                log(
                    `${label} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${err.message}`,
                );
                await sleep(delay);
            }
        }
    }
    throw lastErr;
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

const main = async () => {
    const client = new MongoClient(MONGO_URL, {
        serverSelectionTimeoutMS: 10000,
    });

    try {
        await client.connect();
        log(`Connected to MongoDB at ${MONGO_URL}`);

        const db = client.db();
        const problems = db.collection('problems');
        const backup = db.collection(BACKUP_COLLECTION);

        if (ROLLBACK) {
            await performRollback(db, problems, backup);
            return;
        }

        if (RETRY_FAILED) {
            await performRetry(problems);
            return;
        }

        // Phase 1: snapshot every problem into the backup collection (reversible).
        log(`Phase 1: snapshotting problems into backup collection "${BACKUP_COLLECTION}"...`);
        let snapshotCount = 0;
        const snapshotCursor = problems.find({}).batchSize(BATCH_SIZE);
        while (await snapshotCursor.hasNext()) {
            const doc = await snapshotCursor.next();
            if (!doc) continue;
            if (DRY_RUN) {
                snapshotCount++;
                continue;
            }
            await backup.replaceOne({ _id: doc._id }, doc, { upsert: true });
            snapshotCount++;
        }
        log(`Phase 1 complete: ${snapshotCount} document(s) snapshotted.`);

        // Phase 2: normalize and update descriptions.
        log(`Phase 2: normalizing descriptions (batchSize=${BATCH_SIZE}, dryRun=${DRY_RUN})...`);
        let processed = 0;
        const cursor = problems.find({}).batchSize(BATCH_SIZE);

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            if (!doc) continue;
            processed++;

            const id = String(doc._id);
            const original = doc.description == null ? '' : String(doc.description);

            try {
                const cleaned = normalizeMarkdown(original);

                if (cleaned === original) {
                    logSkip(id, 'already canonical');
                    continue;
                }

                if (DRY_RUN) {
                    logOk(id, original, cleaned);
                    continue;
                }

                await withRetry(
                    () =>
                        problems.updateOne(
                            { _id: doc._id },
                            {
                                $set: {
                                    description: cleaned,
                                    markdownProcessedAt: new Date(),
                                },
                            },
                        ),
                    `update id=${id}`,
                );
                logOk(id, original, cleaned);
            } catch (err) {
                logFail(id, err && err.message ? err.message : String(err));
            }
        }

        // Persist failed records for retry.
        if (failures.length > 0 && !DRY_RUN) {
            const fs = await import('node:fs');
            fs.writeFileSync(FAILED_FILE, JSON.stringify(failures, null, 2));
            log(
                `Wrote ${failures.length} failed record(s) to ${FAILED_FILE}. Use --retry-failed to retry.`,
            );
        }

        // Summary.
        log('------------------------------------------------------------');
        log(`Migration summary:`);
        log(`  processed : ${counts.processed}`);
        log(`  updated   : ${counts.updated}`);
        log(`  skipped   : ${counts.skipped}`);
        log(`  failed    : ${counts.failed}`);
        log(`------------------------------------------------------------`);
        log(
            DRY_RUN
                ? 'Dry run complete — no documents were written.'
                : 'Migration complete. Descriptions normalized and stored as canonical Markdown.',
        );
    } finally {
        await client.close();
    }
};

/**
 * Rollback: restore every backed-up document's description into problems.
 */
const performRollback = async (db, problems, backup) => {
    log(`Rollback: restoring descriptions from "${BACKUP_COLLECTION}"...`);
    let restored = 0;
    let failed = 0;

    const cursor = backup.find({}).batchSize(BATCH_SIZE);
    while (await cursor.hasNext()) {
        const backupDoc = await cursor.next();
        if (!backupDoc) continue;

        const id = String(backupDoc._id);
        if (backupDoc.description == null) {
            log(`SKIP id=${id} (no description in backup)`);
            continue;
        }

        if (DRY_RUN) {
            log(
                `[dry-run] would restore id=${id} description (len=${backupDoc.description.length})`,
            );
            restored++;
            continue;
        }

        try {
            await withRetry(
                () =>
                    problems.updateOne(
                        { _id: backupDoc._id },
                        { $set: { description: backupDoc.description } },
                    ),
                `rollback id=${id}`,
            );
            log(`OK id=${id} restored description (len=${backupDoc.description.length})`);
            restored++;
        } catch (err) {
            log(`FAIL id=${id} reason=${err && err.message ? err.message : err}`);
            failed++;
        }
    }

    log(`------------------------------------------------------------`);
    log(`Rollback summary:`);
    log(`  restored : ${restored}`);
    log(`  failed   : ${failed}`);
    log(`------------------------------------------------------------`);
};

/**
 * Retry previously failed records from --failed-file.
 */
const performRetry = async (problems) => {
    const fs = await import('node:fs');
    let failed;
    try {
        failed = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8'));
    } catch (err) {
        console.error(`[migrate] could not read ${FAILED_FILE}: ${err.message}`);
        process.exit(1);
    }

    if (!Array.isArray(failed) || failed.length === 0) {
        log(`No failed records to retry in ${FAILED_FILE}.`);
        return;
    }

    log(`Retrying ${failed.length} failed record(s)...`);
    let succeeded = 0;
    let stillFailed = [];
    const now = new Date();

    for (const entry of failed) {
        const id = entry.id;
        let doc;
        try {
            doc = await problems.findOne({ _id: new ObjectId(id) });
        } catch {
            // id may not be a valid ObjectId; try string match
            doc = await problems.findOne({ _id: id });
        }

        if (!doc) {
            log(`SKIP id=${id} (no longer exists)`);
            continue;
        }

        const original = doc.description == null ? '' : String(doc.description);
        const cleaned = normalizeMarkdown(original);

        if (cleaned === original) {
            log(`SKIP id=${id} (already canonical)`);
            continue;
        }

        if (DRY_RUN) {
            log(
                `[dry-run] would update id=${id} before=${original.length} after=${cleaned.length}`,
            );
            succeeded++;
            continue;
        }

        try {
            await withRetry(
                () =>
                    problems.updateOne(
                        { _id: doc._id },
                        { $set: { description: cleaned, markdownProcessedAt: now } },
                    ),
                `retry id=${id}`,
            );
            log(`OK id=${id} retried (before=${original.length} after=${cleaned.length})`);
            succeeded++;
        } catch (err) {
            log(`FAIL id=${id} reason=${err && err.message ? err.message : err}`);
            stillFailed.push({ ...entry, retries: (entry.retries || 0) + 1 });
        }
    }

    if (stillFailed.length > 0 && !DRY_RUN) {
        fs.writeFileSync(FAILED_FILE, JSON.stringify(stillFailed, null, 2));
        log(`Wrote ${stillFailed.length} still-failed record(s) to ${FAILED_FILE}.`);
    }

    log(`------------------------------------------------------------`);
    log(`Retry summary:`);
    log(`  attempted : ${failed.length}`);
    log(`  succeeded : ${succeeded}`);
    log(`  still failed: ${stillFailed.length}`);
    log(`------------------------------------------------------------`);
};

main().catch((error) => {
    console.error('[migrate] unexpected failure:', error);
    process.exit(1);
});
