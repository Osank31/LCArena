import { type UserType } from "@LCArena/models"

/**
 * The authenticated identity attached to a request by `userValidation` (services)
 * and by `authenticate` (gateway).
 */
export interface AuthenticatedUser {
    userId: string
    userRole?: UserType
}

/**
 * Single source of truth for `req.user`.
 *
 * This used to live inside `userValidation.ts`, which meant any file reading
 * `req.user` only compiled when that exact sibling happened to be in the same
 * program (it broke `roleValidation.ts` and the gateway). A `declare global` is
 * applied program-wide as soon as *this* module is part of the program, so
 * importing `AuthenticatedUser` — or anything else from `@LCArena/middlewares` —
 * is enough.
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser
        }
    }
}

export {}
