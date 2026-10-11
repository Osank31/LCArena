/**
 * Schema-level unit tests for the Submission model.
 *
 * The status column is a `Mixed` field that stores the evaluator's verdict
 * union, so these tests pin the language enum, the required source code and the
 * fact that every canonical verdict survives a round trip through the schema.
 *
 * Run with: npm run test:unit
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import mongoose from "mongoose"
import Submission, { ELanguage } from "../../src/submission.model.js"
import { type ExecutionResult } from "@LCArena/execution"

const problemId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()

const submission = (overrides: Record<string, unknown> = {}) =>
    new Submission({
        problemId,
        userId,
        code: "print(1)",
        language: ELanguage.py,
        status: { status: "PENDING" },
        ...overrides,
    })

/** Runs schema validation and returns the ValidationError, if any. */
const validationError = async (doc: { validate(): Promise<void> }) => {
    try {
        await doc.validate()
        return undefined
    } catch (error) {
        return error as Error & { errors: Record<string, unknown> }
    }
}

describe("ELanguage", () => {
    it("contains exactly the languages the evaluator supports", () => {
        assert.deepEqual(Object.values(ELanguage).sort(), [
            "cpp",
            "java",
            "js",
            "py",
        ])
    })
})

describe("Submission schema", () => {
    it("accepts a well-formed submission and casts the ids", async () => {
        const doc = submission()
        const error = await validationError(doc)

        assert.equal(error, undefined)
        assert.ok(doc.problemId instanceof mongoose.Types.ObjectId)
        assert.ok(doc.userId instanceof mongoose.Types.ObjectId)
        assert.equal(doc.problemId.toString(), problemId)
    })

    it("requires the source code", async () => {
        const error = await validationError(submission({ code: undefined }))

        assert.ok(error?.errors.code)
    })

    it("rejects an unsupported language", async () => {
        const error = await validationError(submission({ language: "rust" }))

        assert.ok(error?.errors.language)
    })

    it("requires a status so a submission can never be verdict-less", async () => {
        const error = await validationError(submission({ status: undefined }))

        assert.ok(error?.errors.status)
    })

    it("stores every canonical execution verdict unchanged", async () => {
        const verdicts: ExecutionResult[] = [
            { status: "PENDING" },
            { status: "COMPILE_ERROR", compileError: "expected ;" },
            {
                status: "SUCCESS",
                passed: 39,
                total: 40,
                failedCases: { tle: [], re: [], wa: ["test_case_id040"] },
                executionTimeMs: { test_case_id001: 7 },
            },
            { status: "INTERNAL_ERROR", message: "docker unavailable" },
        ]

        for (const status of verdicts) {
            const doc = submission({ status })
            assert.equal(await validationError(doc), undefined)
            assert.deepEqual(doc.toObject().status, status)
        }
    })

    it("records timestamps for auditing", () => {
        assert.equal(Submission.schema.options.timestamps, true)
    })
})
