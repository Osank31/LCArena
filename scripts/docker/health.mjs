#!/usr/bin/env node
/**
 * docker:health — summarise the state of the local backend Compose stack.
 *
 *   npm run docker:health
 *   npm run docker:health -- --file docker-compose.test.yml
 *   npm run docker:health -- --project lcarena-test
 *
 * Prints one row per Compose service with its state and health, then exits
 * non-zero if anything is not running/healthy. This is a convenience view over
 * `docker compose ps`; it never mutates the stack.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

const composeFile = valueOf("--file") || "docker-compose.yml";
const project = valueOf("--project");

const composeArgs = ["compose", "-f", path.resolve(ROOT, composeFile)];
if (project) composeArgs.push("-p", project);

if (args.includes("--help") || args.includes("-h")) {
    console.log(
        "Usage: node scripts/docker/health.mjs [--file <compose-file>] [--project <name>]"
    );
    process.exit(0);
}

const dockerVersion = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    encoding: "utf8",
});

if (dockerVersion.status !== 0 || !dockerVersion.stdout.trim()) {
    console.error(
        "[health] the Docker daemon is not reachable. Start Docker Desktop (or dockerd) and try again."
    );
    if (dockerVersion.stderr?.trim()) console.error(dockerVersion.stderr.trim());
    process.exit(2);
}

const ps = spawnSync(
    "docker",
    [...composeArgs, "ps", "--all", "--format", "json"],
    { encoding: "utf8" }
);

if (ps.status !== 0) {
    console.error("[health] `docker compose ps` failed:");
    console.error((ps.stderr || ps.stdout || "").trim());
    process.exit(1);
}

/** `docker compose ps --format json` emits one JSON document per line. */
const services = ps.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        try {
            return JSON.parse(line);
        } catch {
            return null;
        }
    })
    .filter(Boolean);

if (services.length === 0) {
    console.log(
        `[health] no containers found for ${composeFile}${project ? ` (project ${project})` : ""}. Start the stack with \`npm run docker:up\`.`
    );
    process.exit(1);
}

const rows = services.map((service) => {
    const name = service.Service || service.Name;
    const state = (service.State || "unknown").toLowerCase();
    const health = String(service.Health || "").toLowerCase();
    const status = health || state;
    const ports = service.Publishers?.filter((p) => p.PublishedPort)
        .map((p) => `${p.PublishedPort}->${p.TargetPort}`)
        .join(", ");

    const healthy =
        state === "running" && (health === "" || health === "healthy");

    return { name, state, health: health || "-", status, ports, healthy, raw: service };
});

const nameWidth = Math.max(8, ...rows.map((row) => row.name.length));
const stateWidth = Math.max(6, ...rows.map((row) => row.state.length));
const healthWidth = Math.max(6, ...rows.map((row) => row.health.length));

console.log(`\nBackend stack: ${composeFile}${project ? ` (project ${project})` : ""}\n`);
console.log(
    `${"SERVICE".padEnd(nameWidth)}  ${"STATE".padEnd(stateWidth)}  ${"HEALTH".padEnd(healthWidth)}  PORTS`
);
console.log("-".repeat(nameWidth + stateWidth + healthWidth + 30));

for (const row of rows) {
    const marker = row.healthy ? " " : "!";
    console.log(
        `${marker}${row.name.padEnd(nameWidth)}  ${row.state.padEnd(stateWidth)}  ${row.health.padEnd(healthWidth)}  ${row.ports || "-"}`
    );
}

const unhealthy = rows.filter((row) => !row.healthy);

if (unhealthy.length > 0) {
    console.log(
        `\n[health] ${unhealthy.length} service(s) are not healthy: ${unhealthy
            .map((row) => `${row.name} (${row.status})`)
            .join(", ")}`
    );
    console.log("[health] recent logs: npm run docker:logs");
    process.exit(1);
}

console.log(`\n[health] all ${rows.length} services are running and healthy.`);
