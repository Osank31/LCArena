/**
 * Unit tests for the downstream `userValidation` middleware.
 *
 * This is the middleware that turns the gateway-injected `x-user-id` header into
 * `req.user`. It must fail closed (401 without a header, 404 for an unknown id)
 * because every service behind the gateway trusts whatever it produces.
 *
 * `@LCArena/models` is module-mocked once (Node only allows one mock per
 * specifier) with a swappable delegate, so the tests run without MongoDB.
 * Run with: npm run test:unit
 */
import { before, beforeEach, describe, it, mock } from "node:test"
import assert from "node:assert/strict"
import { NotFoundError } from "@LCArena/utils"
import { UserType } from "@LCArena/models"
import { createHarness } from "./helpers.js"

type FindById = (id: string) => Promise<unknown>

let findById: FindById = async () => null
let seededUser: unknown = null
const queriedIds: string[] = []

let userValidation: (
    req: Parameters<typeof createHarness>[0] extends never ? never : any,
    res: any,
    next: any
) => Promise<void>

before(async () => {
    mock.module("@LCArena/models", {
        exports: {
            User: {
                findById: async (id: string) => {
                    queriedIds.push(id)
                    return findById(id)
                },
            },
            UserType,
        },
    })

    ;({ userValidation } = await import("../../src/userValidation.js"))
})

beforeEach(() => {
    queriedIds.length = 0
    seededUser = null
    findById = async () => seededUser
})

describe("userValidation", () => {
    it("rejects a request with no x-user-id header", async () => {
        const { req, res, recorded, next, errors } = createHarness()

        await userValidation(req, res, next)

        assert.equal(recorded.statusCode, 401)
        assert.deepEqual(recorded.body, { message: "Missing user header" })
        assert.equal(queriedIds.length, 0)
        assert.equal(errors.length, 0)
    })

    it("rejects a header that is not a single string", async () => {
        const { req, res, recorded, next } = createHarness({
            headers: { "x-user-id": ["a", "b"] },
        } as unknown as Parameters<typeof createHarness>[0])

        await userValidation(req, res, next)

        assert.equal(recorded.statusCode, 401)
        assert.equal(queriedIds.length, 0)
    })

    it("strips surrounding quotes before querying and attaches req.user", async () => {
        seededUser = { _id: "user-1", userType: UserType.Admin }

        const { req, res, next, nextCalls, errors } = createHarness({
            headers: { "x-user-id": '"user-1"' },
        } as unknown as Parameters<typeof createHarness>[0])

        await userValidation(req, res, next)

        assert.deepEqual(queriedIds, ["user-1"])
        assert.deepEqual(req.user, {
            userId: "user-1",
            userRole: UserType.Admin,
        })
        assert.equal(nextCalls(), 1)
        assert.equal(errors.length, 0)
    })

    it("delegates an unknown user to the error handler as a 404", async () => {
        seededUser = null

        const { req, res, next, nextCalls, errors } = createHarness({
            headers: { "x-user-id": "ghost" },
        } as unknown as Parameters<typeof createHarness>[0])

        await userValidation(req, res, next)

        assert.equal(nextCalls(), 0)
        assert.equal(errors.length, 1)
        assert.ok(errors[0] instanceof NotFoundError)
        assert.equal(req.user, undefined)
    })

    it("forwards database failures instead of swallowing them", async () => {
        findById = async () => {
            throw new Error("mongo is down")
        }

        const { req, res, next, errors } = createHarness({
            headers: { "x-user-id": "user-1" },
        } as unknown as Parameters<typeof createHarness>[0])

        await userValidation(req, res, next)

        assert.equal(errors.length, 1)
        assert.equal((errors[0] as Error).message, "mongo is down")
    })
})
