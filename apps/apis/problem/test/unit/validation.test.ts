/**
 * Unit tests for the problem validation contract.
 *
 * Pure schema tests: no MongoDB, no HTTP. They pin the create/update contract
 * the controller relies on, including the exact bounds that used to be easy to
 * loosen by accident.
 *
 * Run with:
 *   npm run test:unit   (or npm test)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    createProblemSchema,
    updateProblemSchema,
} from "../../src/validation";

const validProblem = () => ({
    description: "Find the sum of two integers from standard input.",
    difficulty: "Easy" as const,
    sampleTestCaseUrl: "https://cdn.lcarena.local/sample-1.txt",
    testCasesUrl: "https://cdn.lcarena.local/testcases-1.zip",
    time_limit: 2000,
});

describe("createProblemSchema", () => {
    it("accepts a complete, well-formed problem", () => {
        const parsed = createProblemSchema.parse(validProblem());

        assert.equal(parsed.difficulty, "Easy");
        assert.equal(parsed.time_limit, 2000);
    });

    it("accepts every supported difficulty", () => {
        for (const difficulty of ["Easy", "Medium", "Hard"] as const) {
            const parsed = createProblemSchema.parse({
                ...validProblem(),
                difficulty,
            });
            assert.equal(parsed.difficulty, difficulty);
        }
    });

    it("rejects an unsupported difficulty", () => {
        const result = createProblemSchema.safeParse({
            ...validProblem(),
            difficulty: "Impossible",
        });

        assert.equal(result.success, false);
    });

    it("rejects a description shorter than 10 characters", () => {
        const result = createProblemSchema.safeParse({
            ...validProblem(),
            description: "short",
        });

        assert.equal(result.success, false);
    });

    it("rejects an empty or missing test-case location", () => {
        assert.equal(
            createProblemSchema.safeParse({
                ...validProblem(),
                sampleTestCaseUrl: "",
            }).success,
            false
        );

        const { testCasesUrl: _omitted, ...withoutTestCases } = validProblem();
        assert.equal(createProblemSchema.safeParse(withoutTestCases).success, false);
    });

    it("rejects a non-positive time limit", () => {
        for (const time_limit of [0, -1]) {
            const result = createProblemSchema.safeParse({
                ...validProblem(),
                time_limit,
            });
            assert.equal(result.success, false, `time_limit ${time_limit}`);
        }
    });

    it("rejects a non-numeric time limit", () => {
        const result = createProblemSchema.safeParse({
            ...validProblem(),
            time_limit: "2000",
        });

        assert.equal(result.success, false);
    });
});

describe("updateProblemSchema", () => {
    it("accepts a partial update", () => {
        const parsed = updateProblemSchema.parse({ difficulty: "Hard" });

        assert.equal(parsed.difficulty, "Hard");
    });

    it("accepts an empty object (no fields to change)", () => {
        assert.deepEqual(updateProblemSchema.parse({}), {});
    });

    it("still validates provided fields", () => {
        assert.equal(
            updateProblemSchema.safeParse({ time_limit: -5 }).success,
            false
        );
        assert.equal(
            updateProblemSchema.safeParse({ difficulty: "Trivial" }).success,
            false
        );
    });
});
