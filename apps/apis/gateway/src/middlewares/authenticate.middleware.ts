import { type NextFunction, type Request, type Response } from "express"
import jwt from "jsonwebtoken"
import { User } from "@LCArena/models"
import { UnauthorizedError } from "@LCArena/utils"
import { type AuthenticatedUser } from "@LCArena/middlewares"
import { isAccessTokenRevoked, verifyAccessToken } from "../services/token.service"

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export const bearerToken = (req: Request): string | undefined => {
    const header = req.headers.authorization

    if (!header || typeof header !== "string") return undefined

    const [scheme, token] = header.split(" ")

    if (!token || scheme?.toLowerCase() !== "bearer") return undefined

    return token
}

/**
 * Verifies the access token and exposes the caller as `req.user`, which is the
 * same shape `roleValidation` and downstream services expect.
 */
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = bearerToken(req)

        if (!token) throw new UnauthorizedError("Missing bearer token")

        let payload

        try {
            payload = verifyAccessToken(token)
        } catch (error) {
            // The client can tell these apart: only an expired token is worth
            // retrying via /auth/refresh.
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError("Access token expired")
            }

            throw new UnauthorizedError("Invalid access token")
        }

        if (await isAccessTokenRevoked(payload.jti)) {
            throw new UnauthorizedError("Access token has been revoked")
        }

        // Re-read the user so a deleted account or a role change takes effect
        // immediately instead of at token expiry. The role in the token is
        // deliberately not trusted for authorization.
        const user = await User.findById(payload.userId)

        if (!user) throw new UnauthorizedError("User no longer exists")

        const authenticatedUser: AuthenticatedUser = {
            userId: String(user._id),
            userRole: user.userType,
        }

        req.user = authenticatedUser

        next()
    } catch (error) {
        next(error)
    }
}
