/**
 * Schema-level unit tests for the Problem model: required fields, the difficulty
 * enum and the 5000 ms default execution budget that the evaluator relies on.
 *
 * Run with: npm run test:unit
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import Problem from "../../src/problem.model.js"

const validProblem = {
    description: "Given N, print the sum of the first N integers.",
    difficulty: "Easy" as const,
    sampleTestCaseUrl: "https://storage.example.com/sample.txt",
    testCasesUrl: "https://storage.example.com/testcases.zip",
}

/** Runs schema validation and returns the ValidationError, if any. */
const validationError = async (doc: { validate(): Promise<void> }) => {
    try {
        await doc.validate()
        return undefined
    } catch (error) {
        return error as Error & { errors: Record<string, unknown> }
    }
}

describe("Problem schema", () => {
    it("accepts a well-formed problem", async () => {
        const error = await validationError(new Problem(validProblem))

        assert.equal(error, undefined)
    })

    it("requires every documented field", async () => {
        const error = await validationError(new Problem({}))

        assert.ok(error)
        assert.deepEqual(Object.keys(error.errors).sort(), [
            "description",
            "difficulty",
            "sampleTestCaseUrl",
            "testCasesUrl",
        ])
    })

    it("defaults the time limit to 5000 ms", () => {
        const problem = new Problem(validProblem)

        assert.equal(problem.time_limit, 5000)
    })

    it("only accepts Easy, Medium or Hard", async () => {
        for (const difficulty of ["Easy", "Medium", "Hard"]) {
            assert.equal(
                await validationError(new Problem({ ...validProblem, difficulty })),
                undefined,
                `${difficulty} should be accepted`
            )
        }

        const error = await validationError(
            new Problem({
                ...validProblem,
                difficulty: "Impossible",
            })
        )

        assert.ok(error?.errors.difficulty)
    })

    it("records timestamps for auditing", () => {
        assert.equal(Problem.schema.options.timestamps, true)
    })
})
