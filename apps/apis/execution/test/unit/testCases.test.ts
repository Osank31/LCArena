import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createWriteStream } from "fs";
import { crc32, createGzip } from "zlib";
import { pipeline } from "stream/promises";
import tar from "tar-stream";
import { TestCasesUnavailableError } from "@LCArena/execution";
import {
    acquireTestCases,
    resolveSafeEntryPath,
    TestCaseSourceError,
} from "../../src/testCases";

let scratchDir: string;

const makeTestCaseTree = async (root: string): Promise<void> => {
    for (const [folder, input, answer] of [
        ["test_case_id001", "2\n0 0 1 1\n", "1\n"],
        ["test_case_id002", "2\n0 0 2 2\n", "2\n"],
    ]) {
        const dir = path.join(root, folder);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, "case.in"), input);
        await fs.writeFile(path.join(dir, "case.ans"), answer);
    }
};

const makeTarGz = async (archivePath: string): Promise<void> => {
    const pack = tar.pack();
    const done = pipeline(pack, createGzip(), createWriteStream(archivePath));

    pack.entry({ name: "test_case_id001/case.in" }, "2\n0 0 1 1\n");
    pack.entry({ name: "test_case_id001/case.ans" }, "1\n");
    pack.entry({ name: "test_case_id002/case.in" }, "2\n0 0 2 2\n");
    pack.entry({ name: "test_case_id002/case.ans" }, "2\n");
    pack.finalize();

    await done;
};

interface ZipEntry {
    name: string;
    data: string;
}

/**
 * Writes a minimal "stored" (uncompressed) zip so the zip reader is exercised
 * without adding a zip-writing dependency.
 */
const makeStoredZip = async (
    archivePath: string,
    entries: ZipEntry[]
): Promise<void> => {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let localOffset = 0;

    for (const entry of entries) {
        const name = Buffer.from(entry.name, "utf-8");
        const data = Buffer.from(entry.data, "utf-8");
        const checksum = crc32(data);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0, 6);
        local.writeUInt16LE(0, 8);
        local.writeUInt32LE(checksum, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);

        localParts.push(local, name, data);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt32LE(checksum, 16);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(localOffset, 42);

        centralParts.push(central, name);

        localOffset += local.length + name.length + data.length;
    }

    const centralSize = centralParts.reduce(
        (sum, part) => sum + part.length,
        0
    );

    const endOfCentralDirectory = Buffer.alloc(22);
    endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
    endOfCentralDirectory.writeUInt16LE(entries.length, 8);
    endOfCentralDirectory.writeUInt16LE(entries.length, 10);
    endOfCentralDirectory.writeUInt32LE(centralSize, 12);
    endOfCentralDirectory.writeUInt32LE(localOffset, 16);

    await fs.writeFile(
        archivePath,
        Buffer.concat([
            ...localParts,
            ...centralParts,
            endOfCentralDirectory,
        ])
    );
};

before(async () => {
    scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "lcarena-tc-test-"));
});

after(async () => {
    await fs.rm(scratchDir, { recursive: true, force: true });
});

describe("resolveSafeEntryPath", () => {
    it("keeps normal entries inside the destination", () => {
        const target = resolveSafeEntryPath("/tmp/root", "a/b/c.in");
        assert.equal(target, path.resolve("/tmp/root", "a/b/c.in"));
    });

    it("rejects parent-directory traversal", () => {
        for (const entry of [
            "../evil",
            "a/../../evil",
            "..\\evil",
            "/etc/passwd",
            "C:/Windows/system32",
            "",
        ]) {
            assert.throws(
                () => resolveSafeEntryPath("/tmp/root", entry),
                TestCaseSourceError,
                `expected ${JSON.stringify(entry)} to be rejected`
            );
        }
    });
});

describe("acquireTestCases", () => {
    it("copies a local directory of test cases", async () => {
        const source = path.join(scratchDir, "local-cases");
        await makeTestCaseTree(source);

        const acquired = await acquireTestCases({ testCasesUrl: source });

        try {
            const files = await fs.readdir(acquired.testCasesDir);
            assert.ok(files.includes("test_case_id001"));

            const input = await fs.readFile(
                path.join(acquired.testCasesDir, "test_case_id001", "case.in"),
                "utf-8"
            );
            assert.equal(input, "2\n0 0 1 1\n");
        } finally {
            await acquired.cleanup();
        }

        await assert.rejects(() => fs.stat(acquired.testCasesDir));
    });

    it("extracts a tar.gz archive and flattens a single wrapper directory", async () => {
        const archive = path.join(scratchDir, "cases.tar.gz");
        await makeTarGz(archive);

        const acquired = await acquireTestCases({ testCasesUrl: archive });

        try {
            const entries = await fs.readdir(acquired.testCasesDir);
            assert.ok(entries.includes("test_case_id001"));
            assert.ok(entries.includes("test_case_id002"));
        } finally {
            await acquired.cleanup();
        }
    });

    it("extracts a zip archive", async () => {
        const archive = path.join(scratchDir, "cases.zip");
        await makeStoredZip(archive, [
            { name: "test_case_id001/case.in", data: "2\n0 0 1 1\n" },
            { name: "test_case_id001/case.ans", data: "1\n" },
        ]);

        const acquired = await acquireTestCases({ testCasesUrl: archive });

        try {
            const entries = await fs.readdir(acquired.testCasesDir);
            assert.ok(entries.includes("test_case_id001"));
        } finally {
            await acquired.cleanup();
        }
    });

    it("rejects a zip archive containing a path-traversal entry", async () => {
        const archive = path.join(scratchDir, "evil.zip");
        await makeStoredZip(archive, [
            { name: "test_case_id001/case.in", data: "1\n" },
            { name: "test_case_id001/case.ans", data: "1\n" },
            { name: "../escaped.txt", data: "pwned" },
        ]);

        await assert.rejects(
            () => acquireTestCases({ testCasesUrl: archive }),
            TestCaseSourceError
        );
    });

    it("throws when the source does not exist", async () => {
        await assert.rejects(
            () =>
                acquireTestCases({
                    testCasesUrl: path.join(scratchDir, "nope.zip"),
                }),
            TestCaseSourceError
        );
    });

    it("rejects an archive with no usable test cases", async () => {
        const emptyArchive = path.join(scratchDir, "empty.tar.gz");
        const pack = tar.pack();
        const done = pipeline(
            pack,
            createGzip(),
            createWriteStream(emptyArchive)
        );
        pack.entry({ name: "readme.txt" }, "nothing here");
        pack.finalize();
        await done;

        await assert.rejects(
            () => acquireTestCases({ testCasesUrl: emptyArchive }),
            TestCasesUnavailableError
        );
    });

    it("enforces the entry-count limit", async () => {
        const source = path.join(scratchDir, "many-cases");
        await makeTestCaseTree(source);

        await assert.rejects(
            () =>
                acquireTestCases({
                    testCasesUrl: source,
                    maxEntries: 1,
                }),
            TestCaseSourceError
        );
    });

    it("resolves bundled test cases for legacy 'that' reference", async () => {
        const acquired = await acquireTestCases({ testCasesUrl: "that" });
        try {
            const files = await fs.readdir(acquired.testCasesDir);
            assert.ok(files.some((f) => f.startsWith("test_case_")));
        } finally {
            await acquired.cleanup();
        }
    });
});
