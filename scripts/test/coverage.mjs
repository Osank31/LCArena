#!/usr/bin/env node
/**
 * Backend coverage runner.
 *
 *   npm run test:coverage                    # every testable backend workspace
 *   npm run test:coverage -- --workspace=@LCArena/utils
 *   npm run test:coverage -- --keep-going    # report all results even after a failure
 *
 * For each workspace it runs that workspace's unit tests under Node's built-in
 * V8 coverage (no extra dependency) and writes an lcov report to
 * `<workspace>/coverage/lcov.info`. It then merges the reports into
 * `coverage/lcov.info` / `coverage/summary.json` at the repo root and prints a
 * per-workspace summary plus the modules that are barely covered.
 *
 * Coverage is reported, never faked: a workspace whose tests fail fails the
 * command, and no file is excluded just to make the numbers look better.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Backend workspaces that own unit tests. `moduleMocks` mirrors the flag the
 * workspace's own `test:unit` script needs. The frontend and the Python
 * AI service are intentionally absent: this is a backend-only command.
 */
const WORKSPACES = [
    { dir: "packages/backend/utils" },
    { dir: "packages/backend/models" },
    { dir: "packages/backend/config" },
    { dir: "packages/backend/execution" },
    { dir: "packages/backend/middlewares", moduleMocks: true },
    { dir: "apps/apis/gateway" },
    { dir: "apps/apis/problem" },
    { dir: "apps/apis/submission" },
    { dir: "apps/apis/execution" },
    { dir: "apps/apis/mail" },
];

const args = process.argv.slice(2);
const valueOf = (flag) => {
    const match = args.find((arg) => arg.startsWith(`${flag}=`));
    return match ? match.slice(flag.length + 1) : undefined;
};

if (args.includes("--help") || args.includes("-h")) {
    console.log(
        "Usage: node scripts/test/coverage.mjs [--workspace=<name|path>] [--keep-going]"
    );
    process.exit(0);
}

const only = valueOf("--workspace");
const keepGoing = args.includes("--keep-going");

const selected = WORKSPACES.filter(({ dir }) => {
    if (!only) return true;
    return dir === only || dir.endsWith(`/${only}`) || path.basename(dir) === only;
});

if (selected.length === 0) {
    console.error(`[coverage] no workspace matched "${only}"`);
    process.exit(2);
}

const run = (command, options) =>
    new Promise((resolve) => {
        const child = spawn(command[0], command.slice(1), {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdio: "inherit",
        });
        child.on("close", (code) => resolve(code ?? 1));
        child.on("error", (error) => {
            console.error(`[coverage] failed to run ${command.join(" ")}: ${error.message}`);
            resolve(1);
        });
    });

const results = [];

for (const workspace of selected) {
    const cwd = path.join(ROOT, workspace.dir);
    const testDir = path.join(cwd, "test", "unit");

    if (!fs.existsSync(testDir)) {
        console.log(`\n[coverage] skipping ${workspace.dir}: no test/unit directory`);
        results.push({ workspace: workspace.dir, status: "skipped" });
        continue;
    }

    const coverageDir = path.join(cwd, "coverage");
    fs.mkdirSync(coverageDir, { recursive: true });

    console.log(`\n[coverage] ${workspace.dir}`);

    const command = [
        process.execPath,
        ...(workspace.moduleMocks ? ["--experimental-test-module-mocks"] : []),
        "--import",
        "tsx",
        "--test",
        "--experimental-test-coverage",
        "--test-coverage-exclude=test/**",
        // Linked workspace packages resolve to their built `dist` output; those
        // are artifacts of other workspaces' tests, not this one's source.
        "--test-coverage-exclude=**/dist/**",
        "--test-reporter=spec",
        "--test-reporter-destination=stdout",
        "--test-reporter=lcov",
        `--test-reporter-destination=${path.join(coverageDir, "lcov.info")}`,
        "test/unit/*.test.ts",
    ];

    let code = 1;
    try {
        code = await run(command, { cwd });
    } catch (error) {
        console.error(`[coverage] ${workspace.dir} crashed: ${error.message}`);
    }

    results.push({ workspace: workspace.dir, status: code === 0 ? "passed" : "failed", code });

    if (code !== 0 && !keepGoing) {
        console.error(`\n[coverage] ${workspace.dir} failed; stopping. Re-run with --keep-going to continue.`);
        break;
    }
}

// --- Aggregate lcov ---------------------------------------------------------

const parseLcov = (content) => {
    const files = [];
    let current = null;

    for (const line of content.split("\n")) {
        if (line.startsWith("SF:")) {
            current = { file: line.slice(3).trim(), lines: {}, branches: {}, functions: {} };
        } else if (line.startsWith("LF:") && current) {
            current.lines.found = Number(line.slice(3));
        } else if (line.startsWith("LH:") && current) {
            current.lines.hit = Number(line.slice(3));
        } else if (line.startsWith("BRF:") && current) {
            current.branches.found = Number(line.slice(4));
        } else if (line.startsWith("BRH:") && current) {
            current.branches.hit = Number(line.slice(4));
        } else if (line.startsWith("FNF:") && current) {
            current.functions.found = Number(line.slice(4));
        } else if (line.startsWith("FNH:") && current) {
            current.functions.hit = Number(line.slice(4));
        } else if (line === "end_of_record" && current) {
            files.push(current);
            current = null;
        }
    }

    return files;
};

const merged = [];
const perWorkspace = [];
const mergedLcov = [];

for (const result of results) {
    if (result.status !== "passed") continue;

    const lcovPath = path.join(ROOT, result.workspace, "coverage", "lcov.info");
    if (!fs.existsSync(lcovPath)) continue;

    const content = fs.readFileSync(lcovPath, "utf8");
    const files = parseLcov(content);

    const totals = { lines: [0, 0], branches: [0, 0], functions: [0, 0] };
    for (const file of files) {
        totals.lines[0] += file.lines.hit || 0;
        totals.lines[1] += file.lines.found || 0;
        totals.branches[0] += file.branches.hit || 0;
        totals.branches[1] += file.branches.found || 0;
        totals.functions[0] += file.functions.hit || 0;
        totals.functions[1] += file.functions.found || 0;
    }

    for (const file of files) {
        // Normalize `src\AppError.ts` -> `packages/backend/utils/src/AppError.ts`.
        const normalized = file.file.replace(/\\/g, "/").replace(/^\.\//, "");
        merged.push({ ...file, workspace: result.workspace, file: normalized });
    }

    mergedLcov.push(
        content.replace(/^SF:(.*)$/gm, (_m, p) => {
            const normalized = p.trim().replace(/\\/g, "/").replace(/^\.\//, "");
            return `SF:${result.workspace}/${normalized}`;
        })
    );

    perWorkspace.push({ workspace: result.workspace, ...totals, files: files.length });
}

const pct = (hit, found) => (found === 0 ? null : (hit / found) * 100);
const fmt = (value) => (value === null ? "  n/a" : `${value.toFixed(2)}%`);

// --- Report -----------------------------------------------------------------

if (perWorkspace.length > 0) {
    console.log("\n=== backend coverage summary ===");
    const width = Math.max(...perWorkspace.map((row) => row.workspace.length));

    console.log(
        `${"WORKSPACE".padEnd(width)}  ${"FILES".padStart(5)}  ${"LINES".padStart(7)}  ${"BRANCH".padStart(7)}  ${"FUNCS".padStart(7)}`
    );
    console.log("-".repeat(width + 34));

    for (const row of perWorkspace) {
        console.log(
            `${row.workspace.padEnd(width)}  ${String(row.files).padStart(5)}  ${fmt(pct(row.lines[0], row.lines[1])).padStart(7)}  ${fmt(pct(row.branches[0], row.branches[1])).padStart(7)}  ${fmt(pct(row.functions[0], row.functions[1])).padStart(7)}`
        );
    }

    const total = merged.reduce(
        (acc, file) => {
            acc.lines[0] += file.lines.hit || 0;
            acc.lines[1] += file.lines.found || 0;
            acc.branches[0] += file.branches.hit || 0;
            acc.branches[1] += file.branches.found || 0;
            acc.functions[0] += file.functions.hit || 0;
            acc.functions[1] += file.functions.found || 0;
            return acc;
        },
        { lines: [0, 0], branches: [0, 0], functions: [0, 0] }
    );

    console.log("-".repeat(width + 34));
    console.log(
        `${"ALL BACKEND".padEnd(width)}  ${String(merged.length).padStart(5)}  ${fmt(pct(total.lines[0], total.lines[1])).padStart(7)}  ${fmt(pct(total.branches[0], total.branches[1])).padStart(7)}  ${fmt(pct(total.functions[0], total.functions[1])).padStart(7)}`
    );

    // Point out the modules that are not meaningfully covered, so a green
    // overall number never hides an untested file.
    const gaps = merged
        .map((file) => ({
            file: `${file.workspace}/${file.file}`,
            coverage: pct(file.lines.hit, file.lines.found),
            found: file.lines.found || 0,
        }))
        .filter((file) => file.found > 0 && (file.coverage ?? 0) < 60)
        .sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0));

    if (gaps.length > 0) {
        console.log("\nModules below 60% line coverage:");
        for (const gap of gaps.slice(0, 25)) {
            console.log(`  ${fmt(gap.coverage).padStart(7)}  ${gap.file}`);
        }
        if (gaps.length > 25) {
            console.log(`  ... and ${gaps.length - 25} more (see coverage/summary.json)`);
        }
    }

    const outputDir = path.join(ROOT, "coverage");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "lcov.info"), mergedLcov.join(""));
    fs.writeFileSync(
        path.join(outputDir, "summary.json"),
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                workspaces: perWorkspace.map((row) => ({
                    workspace: row.workspace,
                    files: row.files,
                    lines: { hit: row.lines[0], found: row.lines[1] },
                    branches: { hit: row.branches[0], found: row.branches[1] },
                    functions: { hit: row.functions[0], found: row.functions[1] },
                })),
                files: merged.map((file) => ({
                    file: `${file.workspace}/${file.file}`,
                    lines: file.lines,
                    branches: file.branches,
                    functions: file.functions,
                })),
            },
            null,
            2
        )
    );

    console.log("\nReports written to coverage/lcov.info and coverage/summary.json");
}

const failed = results.filter((result) => result.status === "failed");
const skipped = results.filter((result) => result.status === "skipped");

if (failed.length > 0) {
    console.log(`\n[coverage] ${failed.length} workspace(s) failed their tests:`);
    for (const result of failed) console.log(`  - ${result.workspace}`);
    process.exit(1);
}

if (skipped.length > 0) {
    console.log(
        `\n[coverage] ${skipped.length} workspace(s) skipped (no test/unit directory): ${skipped
            .map((result) => result.workspace)
            .join(", ")}`
    );
}

console.log("\n[coverage] all selected workspaces passed.");
