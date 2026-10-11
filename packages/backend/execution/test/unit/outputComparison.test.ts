import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    compareOutputs,
    normalizeOutput,
} from "../../src/judging/outputComparison.js";

describe("Output Comparison Policy", () => {
    describe("Exact and normalized matching", () => {
        it("matches identical single-line outputs", () => {
            const result = compareOutputs("42\n", "42\n");
            assert.equal(result.matched, true);
        });

        it("matches identical multi-line outputs", () => {
            const result = compareOutputs("1 2\n3 4\n5 6\n", "1 2\n3 4\n5 6\n");
            assert.equal(result.matched, true);
        });
    });

    describe("Line ending handling (CRLF vs LF)", () => {
        it("matches Windows CRLF output with Unix LF expected output", () => {
            const actual = "hello world\r\n42\r\n";
            const expected = "hello world\n42\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });

        it("matches Unix LF output with Windows CRLF expected output", () => {
            const actual = "hello world\n42\n";
            const expected = "hello world\r\n42\r\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });

        it("handles mixed line endings in output", () => {
            const actual = "line1\r\nline2\nline3\rline4\n";
            const expected = "line1\nline2\nline3\nline4\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });
    });

    describe("Trailing whitespace and blank lines", () => {
        it("ignores trailing whitespace on lines", () => {
            const actual = "hello   \nworld\t\t\n";
            const expected = "hello\nworld\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });

        it("ignores trailing blank lines at end of output", () => {
            const actual = "42\n\n\n";
            const expected = "42\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });

        it("matches when actual has no trailing newline but expected does", () => {
            const actual = "42";
            const expected = "42\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, true);
        });

        it("ignores blank lines between content when ignoreBlankLines is enabled", () => {
            const actual = "1\n\n2\n\n3\n";
            const expected = "1\n2\n3\n";
            const result = compareOutputs(actual, expected, {
                ignoreBlankLines: true,
            });
            assert.equal(result.matched, true);
        });

        it("collapses multiple consecutive space characters within a line", () => {
            const actual = "1    2    3\n";
            const expected = "1 2 3\n";
            const result = compareOutputs(actual, expected, {
                ignoreSpaceChange: true,
            });
            assert.equal(result.matched, true);
        });
    });

    describe("Genuinely incorrect outputs (Wrong Answer)", () => {
        it("rejects wrong numeric values", () => {
            const actual = "43\n";
            const expected = "42\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
            assert.equal(result.diffLine, 1);
            assert.match(result.reason!, /Expected '42', got '43'/);
        });

        it("rejects case differences in strings", () => {
            const actual = "true\n";
            const expected = "True\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
            assert.equal(result.diffLine, 1);
        });

        it("rejects outputs with missing lines", () => {
            const actual = "1\n2\n";
            const expected = "1\n2\n3\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
            assert.equal(result.diffLine, 3);
            assert.match(result.reason!, /Missing output/);
        });

        it("rejects outputs with extra lines", () => {
            const actual = "1\n2\n3\n4\n";
            const expected = "1\n2\n3\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
            assert.equal(result.diffLine, 4);
            assert.match(result.reason!, /Unexpected extra output/);
        });

        it("rejects empty output when non-empty output was expected", () => {
            const actual = "";
            const expected = "100\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
        });

        it("rejects swapped token order", () => {
            const actual = "2 1\n";
            const expected = "1 2\n";
            const result = compareOutputs(actual, expected);
            assert.equal(result.matched, false);
        });
    });

    describe("normalizeOutput helper", () => {
        it("trims trailing spaces and normalizes CRLF", () => {
            const raw = "hello world  \r\nfoo bar \t\r\n";
            const norm = normalizeOutput(raw);
            assert.equal(norm, "hello world\nfoo bar");
        });
    });
});
