/**
 * Unit tests for the shared `appErrorHandler`.
 *
 * Every HTTP error in the backend funnels through this handler, so the response
 * shape ({ success: false, message, errors? }) and the status mapping are part
 * of the public API contract. These tests assert on the emitted response.
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { ZodError, z } from "zod"
import { BadRequestError, ForbiddenError, NotFoundError } from "@LCArena/utils"
import { appErrorHandler } from "../../src/errorHandler.js"
import { createHarness } from "./helpers.js"

const handle = (error: unknown) => {
    const { req, res, recorded, next } = createHarness()

    appErrorHandler(error, req, res, next)

    return recorded
}

describe("appErrorHandler", () => {
    it("maps a ZodError to 400 with per-field issues", () => {
        const schema = z.object({
            email: z.string().email("Invalid email address"),
            age: z.number({ message: "Age must be a number" }),
        })

        let error: ZodError | undefined

        try {
            schema.parse({ email: "nope", age: "old" })
        } catch (caught) {
            error = caught as ZodError
        }

        const recorded = handle(error)

        assert.equal(recorded.statusCode, 400)
        assert.deepEqual(recorded.body, {
            success: false,
            message: "Validation Error",
            errors: [
                { path: ["email"], message: "Invalid email address" },
                { path: ["age"], message: "Age must be a number" },
            ],
        })
    })

    it("uses the AppError status code and message", () => {
        for (const error of [
            new BadRequestError("Provided id isn't valid"),
            new NotFoundError("Problem not found"),
            new ForbiddenError("Role 'Regular' is not allowed to access this path"),
        ]) {
            const recorded = handle(error)

            assert.equal(recorded.statusCode, error.statusCode)
            assert.deepEqual(recorded.body, {
                success: false,
                message: error.message,
            })
        }
    })

    it("does not leak extra AppError internals in the body", () => {
        const recorded = handle(new NotFoundError("Problem not found"))

        assert.deepEqual(Object.keys(recorded.body as object), [
            "success",
            "message",
        ])
    })

    it("treats express body-parser errors with a 4xx status as client errors", () => {
        const bodyParserError = Object.assign(new SyntaxError("Unexpected token } in JSON"), {
            statusCode: 400,
            type: "entity.parse.failed",
        })

        const recorded = handle(bodyParserError)

        assert.equal(recorded.statusCode, 400)
        assert.deepEqual(recorded.body, {
            success: false,
            message: "Unexpected token } in JSON",
        })
    })

    it("maps a mongoose CastError to 400 naming the offending field", () => {
        const castError = Object.assign(new Error("Cast to ObjectId failed"), {
            name: "CastError",
            path: "_id",
        })

        const recorded = handle(castError)

        assert.equal(recorded.statusCode, 400)
        assert.deepEqual(recorded.body, {
            success: false,
            message: "Invalid value for _id",
        })
    })

    it("falls back to 500 for an unexpected error", () => {
        const recorded = handle(new TypeError("cannot read properties of undefined"))

        assert.equal(recorded.statusCode, 500)
        assert.deepEqual(recorded.body, {
            success: false,
            message: "cannot read properties of undefined",
        })
    })

    it("survives a thrown non-Error value", () => {
        const recorded = handle("just a string")

        assert.equal(recorded.statusCode, 500)
        assert.deepEqual(recorded.body, {
            success: false,
            message: "Internal Server Error",
        })
    })
})
