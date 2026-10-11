import { type NextFunction, type Request, type Response } from "express"
import { NotFoundError } from "@LCArena/utils"

/**
 * Fail-closed route catcher: anything not explicitly registered is never forwarded.
 */
export const notFoundHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    next(new NotFoundError(`No gateway route for ${req.method} ${req.originalUrl}`))
}
