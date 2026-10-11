/**
 * Shared helpers for scripts that need a live backend.
 *
 * The integration runner (`scripts/test/run-integration.mjs`) and the load
 * runner (`scripts/load/run-load.mjs`) both need the same primitives: start the
 * ISOLATED test infrastructure from `docker-compose.test.yml`, boot a service
 * with `tsx`, wait for it to actually answer, and always clean up. Keeping that
 * logic here means both commands agree on project name, ports and teardown.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
);

export const COMPOSE_TEST_FILE = path.join(ROOT, "docker-compose.test.yml");
export const TEST_COMPOSE_PROJECT = "lcarena-test";

/** Host ports published by docker-compose.test.yml (isolated from dev). */
export const TEST_PORTS = {
    mongo: 27018,
    redis: 6380,
    rabbitmq: 5673,
};

export const TEST_MONGO_URL =
    process.env.TEST_MONGODB_URL || `mongodb://127.0.0.1:${TEST_PORTS.mongo}/lcarena_load`;
export const TEST_RABBITMQ_URL =
    process.env.TEST_RABBITMQ_URL || `amqp://guest:guest@127.0.0.1:${TEST_PORTS.rabbitmq}`;

export const makeLogger = (label) => (...parts) => console.log(`[${label}]`, ...parts);

export const dockerAvailable = () => {
    const result = spawnSync(
        "docker",
        ["version", "--format", "{{.Server.Version}}"],
        { encoding: "utf8" }
    );

    return result.status === 0 && Boolean(result.stdout?.trim());
};

export const compose = (argsList, options = {}) =>
    new Promise((resolve) => {
        const child = spawn(
            "docker",
            [
                "compose",
                "-p",
                TEST_COMPOSE_PROJECT,
                "-f",
                COMPOSE_TEST_FILE,
                ...argsList,
            ],
            { cwd: ROOT, stdio: options.stdio || "inherit" }
        );

        child.on("close", (code) => resolve(code ?? 1));
        child.on("error", () => resolve(1));
    });

/**
 * Boots a workspace service with tsx.
 *
 * Returns a handle so callers can stop exactly the processes they started
 * (never a broad `pkill`).
 */
export const startService = ({ name, dir, port, env, logDir }) => {
    fs.mkdirSync(logDir, { recursive: true });
    const out = fs.openSync(path.join(logDir, `${name}.log`), "w");

    const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
        cwd: path.join(ROOT, dir),
        env: { ...process.env, ...env },
        stdio: ["ignore", out, out],
    });

    return { name, dir, port, child, logFile: path.join(logDir, `${name}.log`) };
};

export const waitForTcp = (port, timeoutMs = 60_000) => {
    const deadline = Date.now() + timeoutMs;

    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = net.connect({ port, host: "127.0.0.1" });
            socket.once("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.once("error", () => {
                socket.destroy();
                if (Date.now() > deadline) reject(new Error(`port ${port} never opened`));
                else setTimeout(attempt, 250);
            });
        };
        attempt();
    });
};

export const waitForHttp = async (url, timeoutMs = 60_000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch {
            // not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`${url} never became ready`);
};

export const tailLog = (file, lines = 25) => {
    try {
        return fs.readFileSync(file, "utf8").split("\n").slice(-lines).join("\n");
    } catch {
        return "(no log)";
    }
};

export const stopServices = async (services) => {
    for (const service of [...services].reverse()) {
        const { child } = service;

        if (child.exitCode === null && !child.killed) {
            child.kill("SIGTERM");

            await new Promise((resolve) => {
                const timer = setTimeout(() => {
                    child.kill("SIGKILL");
                    resolve();
                }, 5_000);

                child.once("close", () => {
                    clearTimeout(timer);
                    resolve();
                });
            });
        }
    }
};

/** Waits for a started service, printing the log tail when it never comes up. */
export const awaitService = async (service, ready, timeoutMs = 60_000) => {
    try {
        if (ready === "tcp") await waitForTcp(service.port, timeoutMs);
        else await waitForHttp(ready, timeoutMs);
    } catch (error) {
        console.error(
            `\n--- ${service.name} log (tail) ---\n${tailLog(service.logFile)}\n--- end log ---`
        );
        throw new Error(`${service.name} did not become ready: ${error.message}`);
    }
};
