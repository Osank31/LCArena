import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    AppError,
    BadRequestError,
    ConflictError,
    ForbiddenError,
    InternalServerError,
    NotFoundError,
    NotImplementedError,
    UnauthorizedError,
} from "../../src/AppError.js";

interface ErrorCase {
    Ctor: new (message: string) => AppError;
    statusCode: number;
    name: string;
}

const CASES: ErrorCase[] = [
    { Ctor: BadRequestError, statusCode: 400, name: "BadRequestError" },
    { Ctor: UnauthorizedError, statusCode: 401, name: "Unauthorized Error" },
    { Ctor: ForbiddenError, statusCode: 403, name: "ForbiddenError" },
    { Ctor: NotFoundError, statusCode: 404, name: "NotFoundError" },
    { Ctor: ConflictError, statusCode: 409, name: "ConflictError" },
    {
        Ctor: InternalServerError,
        statusCode: 500,
        name: "Internal Server Error",
    },
    { Ctor: NotImplementedError, statusCode: 501, name: "NotImplementedError" },
];

describe("AppError taxonomy", () => {
    for (const { Ctor, statusCode, name } of CASES) {
        it(`${name} is an AppError carrying status ${statusCode}`, () => {
            const error = new Ctor("something specific went wrong");

            assert.ok(error instanceof AppError);
            assert.ok(error instanceof Error);
            assert.equal(error.statusCode, statusCode);
            assert.equal(error.message, "something specific went wrong");
            assert.equal(error.name, name);
        });
    }

    it("lets a subclass override status code and name", () => {
        const error = new InternalServerError("upstream exploded", 503, "Unavailable");

        assert.equal(error.statusCode, 503);
        assert.equal(error.name, "Unavailable");
        assert.ok(error instanceof AppError);
    });

    it("captures a stack trace pointing at the construction site", () => {
        const error = new NotFoundError("missing");
        const stack = error.stack ?? "";

        // captureStackTrace trims the constructor frames, so the first line is
        // the error itself and the next frame is the caller (this test).
        assert.match(stack.split("\n")[0], /^NotFoundError: missing$/);
        assert.match(stack, /appError\.test\.ts/);
    });
});
