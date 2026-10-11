#!/usr/bin/env node
/**
 * Seed 50 realistic coding problems into MongoDB.
 *
 *   npm run seed:problems
 *   npm run seed:problems -- --url=mongodb://127.0.0.1:27017/lcarena
 *   npm run seed:problems -- --count=50
 *   npm run seed:problems -- --dry-run
 *
 * Idempotent: every document this script writes is tagged with a
 * `https://seed.lcarena.local/...` test-case URL, and a re-run replaces exactly
 * those documents. It never touches problems created through the API.
 */
import { MongoClient } from "mongodb";
import { PROBLEMS, formatProblemDescription } from "./problem-data.mjs";

const args = process.argv.slice(2);
const valueOf = (flag) => {
    const match = args.find((arg) => arg.startsWith(`${flag}=`));
    if (match) return match.slice(flag.length + 1);

    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
        return args[index + 1];
    }

    return undefined;
};

if (args.includes("--help") || args.includes("-h")) {
    console.log(
        "Usage: node scripts/test/seed-problems.mjs [--url=<mongo-url>] [--count=<n>] [--dry-run]"
    );
    process.exit(0);
}

const MONGO_URL =
    valueOf("--url") || process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/lcarena";
const count = Number(valueOf("--count") || PROBLEMS.length);
const dryRun = args.includes("--dry-run");

if (!Number.isInteger(count) || count < 1 || count > 500) {
    console.error(`[seed] --count must be an integer between 1 and 500 (got "${valueOf("--count")}")`);
    process.exit(2);
}

const SEED_ORIGIN = "https://seed.lcarena.local";

const buildProblem = (index) => {
    const raw = PROBLEMS[index % PROBLEMS.length];
    const slugSuffix = index >= PROBLEMS.length ? `-${Math.floor(index / PROBLEMS.length) + 1}` : "";
    const slug = `${raw.slug}${slugSuffix}`;

    return {
        title: raw.title,
        slug,
        description: formatProblemDescription(raw),
        difficulty: raw.difficulty,
        tags: raw.tags,
        sampleTestCaseUrl: `${SEED_ORIGIN}/${slug}/sample.txt`,
        testCasesUrl: `${SEED_ORIGIN}/${slug}/testcases.zip`,
        time_limit: raw.time_limit || 3000,
    };
};

const main = async () => {
    const problems = Array.from({ length: count }, (_, index) =>
        buildProblem(index)
    );

    const easyCount = problems.filter((p) => p.difficulty === "Easy").length;
    const medCount = problems.filter((p) => p.difficulty === "Medium").length;
    const hardCount = problems.filter((p) => p.difficulty === "Hard").length;

    console.log(`[seed] Prepared ${problems.length} problems (Easy: ${easyCount}, Medium: ${medCount}, Hard: ${hardCount})`);

    if (dryRun) {
        console.log(
            `[seed] dry run: would replace seeded problems with ${problems.length} document(s):`
        );
        for (const problem of problems.slice(0, 10)) {
            console.log(`  - [${problem.difficulty}] ${problem.title} (${problem.slug})`);
        }
        if (problems.length > 10) console.log(`  ... and ${problems.length - 10} more`);
        return;
    }

    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 5000 });

    try {
        await client.connect();
    } catch (error) {
        console.error(`[seed] could not connect to ${MONGO_URL}: ${error.message}`);
        console.error(
            "[seed] is MongoDB running? Try `npm run docker:up` (development stack) or " +
                "`docker compose -p lcarena-test -f docker-compose.test.yml up -d --wait` (isolated)."
        );
        process.exit(1);
    }

    try {
        const collection = client.db().collection("problems");
        const now = new Date();

        // Idempotency: replace only documents tagged with our seed origin
        const removed = await collection.deleteMany({
            sampleTestCaseUrl: { $regex: `^${SEED_ORIGIN}` },
        });

        const documents = problems.map((problem) => ({
            ...problem,
            createdAt: now,
            updatedAt: now,
        }));

        const inserted = await collection.insertMany(documents);

        console.log(
            `[seed] database: ${client.db().databaseName} — removed ${removed.deletedCount}, inserted ${inserted.insertedCount}`
        );

        const ids = Object.values(inserted.insertedIds).map(String);
        console.log(`[seed] successfully seeded ${ids.length} problems!`);
        console.log(`  Sample IDs: ${ids.slice(0, 3).join(", ")} ...`);
    } finally {
        await client.close();
    }
};

main().catch((error) => {
    console.error("[seed] unexpected failure:", error);
    process.exit(1);
});
