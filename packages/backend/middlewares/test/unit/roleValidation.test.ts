/**
 * Unit tests for the `roleValidation` route guard (RBAC).
 *
 * The guard must fail closed: unauthenticated -> 401, wrong role -> 403, and it
 * must hand rejections to `next(error)` so the shared error handler owns the
 * response. No database or HTTP server is involved.
 */
import { describe, it } from "node:test"

import assert from "node:assert/strict"
import { ForbiddenError, UnauthorizedError } from "@LCArena/utils"
import { UserType } from "@LCArena/models"
import { roleValidation } from "../../src/roleValidation.js"
import { createHarness } from "./helpers.js"

describe("roleValidation", () => {
    it("rejects a request that never went through userValidation", () => {
        const { req, res, next, nextCalls, errors } = createHarness()
        const guard = roleValidation(UserType.Admin)

        guard(req, res, next)

        assert.equal(nextCalls(), 0)
        assert.equal(errors.length, 1)
        assert.ok(errors[0] instanceof UnauthorizedError)
    })

    it("rejects an authenticated user whose role is not allowed", () => {
        const { req, res, next, nextCalls, errors } = createHarness({
            user: { userId: "u1", userRole: UserType.Regular },
        } as unknown as Parameters<typeof createHarness>[0])
        const guard = roleValidation(UserType.Admin)

        guard(req, res, next)

        assert.equal(nextCalls(), 0)
        assert.equal(errors.length, 1)
        assert.ok(errors[0] instanceof ForbiddenError)
        assert.equal((errors[0] as ForbiddenError).statusCode, 403)
    })

    it("rejects an authenticated user with no role at all", () => {
        const { req, res, next, nextCalls, errors } = createHarness({
            user: { userId: "u1" },
        } as unknown as Parameters<typeof createHarness>[0])
        const guard = roleValidation(UserType.Admin, UserType.Premium)

        guard(req, res, next)

        assert.equal(nextCalls(), 0)
        assert.equal(errors.length, 1)
        assert.ok(errors[0] instanceof UnauthorizedError)
    })

    it("lets an allowed role through", () => {
        const { req, res, next, nextCalls, errors } = createHarness({
            user: { userId: "u1", userRole: UserType.Admin },
        } as unknown as Parameters<typeof createHarness>[0])
        const guard = roleValidation(UserType.Admin)

        guard(req, res, next)

        assert.equal(nextCalls(), 1)
        assert.equal(errors.length, 0)
    })

    it("supports several allowed roles", () => {
        const guard = roleValidation(UserType.Admin, UserType.Premium)

        for (const role of [UserType.Admin, UserType.Premium]) {
            const { req, next, nextCalls, errors } = createHarness({
                user: { userId: "u1", userRole: role },
            } as unknown as Parameters<typeof createHarness>[0])

            guard(req, createHarness().res, next)

            assert.equal(nextCalls(), 1, `${role} should be allowed`)
            assert.equal(errors.length, 0)
        }
    })

    it("denies a role that is not in the allow-list when the guard is empty", () => {
        const { req, res, next, nextCalls, errors } = createHarness({
            user: { userId: "u1", userRole: UserType.Admin },
        } as unknown as Parameters<typeof createHarness>[0])

        roleValidation()(req, res, next)

        assert.equal(nextCalls(), 0)
        assert.ok(errors[0] instanceof ForbiddenError)
    })
})
