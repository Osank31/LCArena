import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";
import { sendError, sendSuccess } from "../../src/Response.js";

interface Captured {
    status?: number;
    body?: unknown;
}

/** Minimal Express Response double that records what the helpers emit. */
const fakeResponse = (): { res: Response; captured: Captured } => {
    const captured: Captured = {};

    const res = {
        status(code: number) {
            captured.status = code;

            return res;
        },
        json(body: unknown) {
            captured.body = body;

            return res;
        },
    };

    return { res: res as unknown as Response, captured };
};

describe("response helpers", () => {
    it("sendSuccess defaults to 200 with a null error", () => {
        const { res, captured } = fakeResponse();

        sendSuccess(res, { id: 1 });

        assert.equal(captured.status, 200);
        assert.deepEqual(captured.body, {
            status: 200,
            message: "Success",
            success: true,
            data: { id: 1 },
            error: null,
        });
    });

    it("sendSuccess honours an explicit status and message", () => {
        const { res, captured } = fakeResponse();

        sendSuccess(res, { id: "abc" }, "Problem Created Successfully", 201);

        assert.equal(captured.status, 201);
        assert.deepEqual(captured.body, {
            status: 201,
            message: "Problem Created Successfully",
            success: true,
            data: { id: "abc" },
            error: null,
        });
    });

    it("sendError defaults to 500 with the standard failure shape", () => {
        const { res, captured } = fakeResponse();

        sendError(res);

        assert.equal(captured.status, 500);
        assert.deepEqual(captured.body, {
            status: 500,
            message: "Something went wrong",
            success: false,
            data: null,
            error: null,
        });
    });

    it("sendError carries a custom status, message and error detail", () => {
        const { res, captured } = fakeResponse();

        sendError(res, "Submission not found", 404, "NOT_FOUND");

        assert.equal(captured.status, 404);
        assert.deepEqual(captured.body, {
            status: 404,
            message: "Submission not found",
            success: false,
            data: null,
            error: "NOT_FOUND",
        });
    });
});
