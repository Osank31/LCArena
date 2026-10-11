import { ForbiddenError, UnauthorizedError } from "@LCArena/utils"
import { type Request, type Response, type NextFunction } from "express"
import { type UserType } from "@LCArena/models"

/**
 * Route guard that only lets the listed user roles through.
 *
 * Must be mounted after `userValidation`, which is what populates `req.user`.
 * Fails closed:
 *  - no authenticated user (or a user without a role) -> 401
 *  - authenticated user whose role is not allowed    -> 403
 *
 * Denials are handed to `next(error)` so the shared error handler owns the
 * response and the rejection gets logged.
 */
export const roleValidation = (...allowedRoles: UserType[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const userRole = req.user?.userRole

            if (!userRole) {
                throw new UnauthorizedError(
                    "Unauthenticated request: userValidation must run before roleValidation"
                )
            }
            
            if (!allowedRoles.includes(userRole)) {
                throw new ForbiddenError(
                    `Role '${userRole}' is not allowed to access this path`
                )
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}