import { type NextFunction, type Request, type Response } from "express"

export interface RecordedResponse {
    statusCode?: number
    body?: unknown
}

export interface MiddlewareHarness {
    req: Request
    res: Response
    recorded: RecordedResponse
    /** Errors handed to `next(error)`, i.e. delegated to appErrorHandler. */
    errors: unknown[]
    next: NextFunction
    /** Live count of `next()` calls made without an error. */
    nextCalls(): number
}

/**
 * Minimal Express doubles. They record what the middleware wrote or delegated
 * instead of asserting on mocks being *called*, so tests check behaviour.
 */
export const createHarness = (
    overrides: Partial<Request> = {}
): MiddlewareHarness => {
    const recorded: RecordedResponse = {}
    const errors: unknown[] = []
    let calls = 0

    const res = {
        status(code: number) {
            recorded.statusCode = code
            return this
        },
        json(body: unknown) {
            recorded.body = body
            return this
        },
    } as unknown as Response

    const next: NextFunction = (error?: unknown) => {
        if (error === undefined) {
            calls += 1
            return
        }

        errors.push(error)
    }

    const req = {
        headers: {},
        params: {},
        body: {},
        ...overrides,
    } as unknown as Request

    return {
        req,
        res,
        recorded,
        errors,
        next,
        nextCalls: () => calls,
    }
}
