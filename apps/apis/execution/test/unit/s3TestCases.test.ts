import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    extractPrefixFromStorageUrl,
    validateTestCaseFolderCompleteness,
    TestCaseSourceError,
} from "../../src/testCases.js";
import { TestCasesUnavailableError } from "@LCArena/execution";

describe("Storage URL and Prefix Resolution", () => {
    it("extracts storage prefix from s3:// URLs", () => {
        const url =
            "s3://lcarena-testcases/Evaluation_Test_Cases/Test_Cases_problem123/";
        const prefix = extractPrefixFromStorageUrl(url);
        assert.equal(
            prefix,
            "Evaluation_Test_Cases/Test_Cases_problem123/"
        );
    });

    it("recognizes direct Evaluation_Test_Cases/ prefixes", () => {
        const direct =
            "Evaluation_Test_Cases/Test_Cases_problem456/test_case_001/";
        const prefix = extractPrefixFromStorageUrl(direct);
        assert.equal(prefix, direct);
    });

    it("returns null for non-S3 URLs like http or local paths", () => {
        assert.equal(
            extractPrefixFromStorageUrl("https://example.com/cases.zip"),
            null
        );
        assert.equal(extractPrefixFromStorageUrl("/local/path/to/cases"), null);
    });
});

describe("Test Case Completeness Validation", () => {
    it("rejects an empty folder with no test case subdirectories", async () => {
        const tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "lcarena-validate-empty-")
        );
        try {
            await assert.rejects(
                () => validateTestCaseFolderCompleteness(tempDir),
                TestCasesUnavailableError
            );
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    it("rejects a test case folder missing output.ans", async () => {
        const tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "lcarena-validate-no-ans-")
        );
        try {
            const caseDir = path.join(tempDir, "test_case_001");
            await fs.mkdir(caseDir, { recursive: true });
            await fs.writeFile(path.join(caseDir, "input.in"), "1 2\n");

            await assert.rejects(
                () => validateTestCaseFolderCompleteness(tempDir),
                (err: any) => {
                    assert.ok(err instanceof TestCaseSourceError);
                    assert.match(err.message, /missing expected output/);
                    return true;
                }
            );
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    it("rejects a test case folder missing input.in", async () => {
        const tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "lcarena-validate-no-in-")
        );
        try {
            const caseDir = path.join(tempDir, "test_case_001");
            await fs.mkdir(caseDir, { recursive: true });
            await fs.writeFile(path.join(caseDir, "output.ans"), "3\n");

            await assert.rejects(
                () => validateTestCaseFolderCompleteness(tempDir),
                (err: any) => {
                    assert.ok(err instanceof TestCaseSourceError);
                    assert.match(err.message, /missing input/);
                    return true;
                }
            );
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    it("passes when every test case folder contains both input and output", async () => {
        const tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "lcarena-validate-valid-")
        );
        try {
            for (let i = 1; i <= 3; i++) {
                const caseDir = path.join(
                    tempDir,
                    `test_case_${String(i).padStart(3, "0")}`
                );
                await fs.mkdir(caseDir, { recursive: true });
                await fs.writeFile(path.join(caseDir, "input.in"), `${i}\n`);
                await fs.writeFile(
                    path.join(caseDir, "output.ans"),
                    `${i * 2}\n`
                );
            }

            await assert.doesNotReject(() =>
                validateTestCaseFolderCompleteness(tempDir)
            );
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });
});
