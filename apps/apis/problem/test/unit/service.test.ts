/**
 * Unit tests for the problem service's id guards and the controller's error
 * paths.
 *
 * These deliberately cover only the code paths that run BEFORE any database
 * call: an invalid ObjectId must be rejected without ever reaching MongoDB, and
 * a malformed request body must never invoke the service layer. That keeps the
 * suite fast and dependency-free while pinning down real behaviour.
 *
 * Run with:
 *   npm run test:unit   (or npm test)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BadRequestError } from "@LCArena/utils";
import {
    deleteProblemService,
    getSingleProblemService,
    updateProblemService,
} from "../../src/service";
import {
    createProblem,
    deleteProblem,
    getSingleProblem,
    updateProblem,
} from "../../src/controller";

/** Minimal Express response double capturing what the controller sent. */
const createResponse = () => {
    const res: Record<string, unknown> = { statusCode: 200 };
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body: unknown) => {
        res.body = body;
        return res;
    };
    return res as {
        statusCode: number;
        status: (code: number) => unknown;
        json: (body: unknown) => unknown;
        body?: { success: boolean; message: string; data?: unknown };
    };
};

/** Runs a controller handler, capturing the error passed to `next`. */
const invoke = async (
    handler: (
        req: never,
        res: never,
        next: (error: unknown) => void
    ) => Promise<unknown>,
    req: Record<string, unknown>
) => {
    const res = createResponse();
    let captured: unknown;
    let resolved = false;

    await handler(
        req as never,
        res as never,
        (error: unknown) => {
            captured = error;
        }
    );
    resolved = true;

    return { res, error: captured, resolved };
};

describe("problem service id guards", () => {
    const invalidIds = ["not-an-id", "123", "", "0000"];

    for (const id of invalidIds) {
        it(`getSingleProblemService rejects "${id}" without hitting the database`, async () => {
            await assert.rejects(
                () => getSingleProblemService(id),
                (error: unknown) => error instanceof BadRequestError
            );
        });

        it(`updateProblemService rejects "${id}"`, async () => {
            await assert.rejects(
                () => updateProblemService(id, { difficulty: "Hard" }),
                (error: unknown) => error instanceof BadRequestError
            );
        });

        it(`deleteProblemService rejects "${id}"`, async () => {
            await assert.rejects(
                () => deleteProblemService(id),
                (error: unknown) => error instanceof BadRequestError
            );
        });
    }
});

describe("problem controller error handling", () => {
    it("forwards a malformed create body to the error handler", async () => {
        const { error, resolved } = await invoke(
            createProblem as never,
            { body: { description: "too short" } }
        );

        assert.equal(resolved, true);
        assert.ok(error, "controller must call next(error)");
    });

    it("forwards a malformed update body to the error handler", async () => {
        const { error, resolved } = await invoke(
            updateProblem as never,
            { params: { id: "not-an-id" }, body: { time_limit: -1 } }
        );

        assert.equal(resolved, true);
        assert.ok(error, "controller must call next(error)");
    });

    it("forwards an invalid id on read to the error handler", async () => {
        const { error, resolved } = await invoke(getSingleProblem as never, {
            params: { id: "not-an-id" },
        });

        assert.equal(resolved, true);
        assert.ok(error);
        assert.ok(error instanceof BadRequestError);
    });

    it("forwards an invalid id on delete to the error handler", async () => {
        const { error, resolved } = await invoke(deleteProblem as never, {
            params: { id: "not-an-id" },
        });

        assert.equal(resolved, true);
        assert.ok(error instanceof BadRequestError);
    });
});
