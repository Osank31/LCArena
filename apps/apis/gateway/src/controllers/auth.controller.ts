import {
    type CookieOptions,
    type NextFunction,
    type Request,
    type Response,
} from "express"
import { sendSuccess, UnauthorizedError } from "@LCArena/utils"
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from "../config/env.config"
import { bearerToken } from "../middlewares/authenticate.middleware"
import * as authService from "../services/auth.service"
import {
    changePasswordSchema,
    deleteAccountSchema,
    loginOtpSchema,
    loginSchema,
    logoutSchema,
    refreshSchema,
    registerWithOtpSchema,
    sendOtpSchema,
    updateUserRoleSchema,
} from "../validation/auth.validation"

const refreshCookieOptions: CookieOptions = {
    httpOnly: true, // not readable from JavaScript, protects against XSS
    sameSite: "lax", // blocks cross-site POSTs
    secure: process.env.NODE_ENV === "production",
    path: "/auth", // scoped to /auth so client does not send to downstream APIs
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
}

/**
 * Resolves refresh token from request body or parsed cookie (via cookie-parser).
 */
const resolveRefreshToken = (req: Request): string | undefined => {
    return req.body?.refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME]
}

export const sendOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email } = sendOtpSchema.parse(req.body ?? {})
        await authService.sendOtp(email)

        sendSuccess(res, null, "OTP sent successfully")
    } catch (error) {
        next(error)
    }
}

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = registerWithOtpSchema.parse(req.body ?? {})
        const { user, accessToken, refreshToken } =
            await authService.registerWithOtp(data)

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)

        sendSuccess(res, { user, accessToken }, "User registered successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const loginWithOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = loginOtpSchema.parse(req.body ?? {})
        const { user, accessToken, refreshToken } =
            await authService.loginWithOtp(data)

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)

        sendSuccess(res, { user, accessToken }, "Logged in successfully")
    } catch (error) {
        next(error)
    }
}

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = loginSchema.parse(req.body ?? {})

        const { user, accessToken, refreshToken } = await authService.login(data)

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions)

        sendSuccess(res, { user, accessToken }, "Logged in successfully")
    } catch (error) {
        next(error)
    }
}

export const refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        refreshSchema.parse(req.body ?? {})
        const refreshToken = resolveRefreshToken(req)

        if (!refreshToken) {
            throw new UnauthorizedError("Refresh token is required")
        }

        const tokens = await authService.refresh(refreshToken)

        res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions)

        sendSuccess(
            res,
            { user: tokens.user, accessToken: tokens.accessToken },
            "Session refreshed successfully"
        )
    } catch (error) {
        next(error)
    }
}

export const logout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        logoutSchema.parse(req.body ?? {})
        const refreshToken = resolveRefreshToken(req)

        await authService.logout(refreshToken, bearerToken(req))

        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/auth",
        })

        sendSuccess(res, null, "Logged out successfully")
    } catch (error) {
        next(error)
    }
}

export const me = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authenticatedUser = req.user

        if (!authenticatedUser) {
            throw new UnauthorizedError("Missing authenticated user")
        }

        const profile = await authService.getProfile(authenticatedUser.userId)

        sendSuccess(res, profile, "Profile fetched successfully")
    } catch (error) {
        next(error)
    }
}

export const changePassword = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authenticatedUser = req.user

        if (!authenticatedUser) {
            throw new UnauthorizedError("Missing authenticated user")
        }

        const data = changePasswordSchema.parse(req.body ?? {})
        await authService.changePassword(authenticatedUser.userId, data)

        sendSuccess(res, null, "Password changed successfully")
    } catch (error) {
        next(error)
    }
}

export const deleteAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authenticatedUser = req.user

        if (!authenticatedUser) {
            throw new UnauthorizedError("Missing authenticated user")
        }

        const data = deleteAccountSchema.parse(req.body ?? {})
        await authService.deleteAccount(authenticatedUser.userId, data.password)

        // Drop session and clear cookies
        const refreshToken = resolveRefreshToken(req)
        await authService.logout(refreshToken, bearerToken(req))

        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/auth",
        })

        sendSuccess(res, null, "Account deleted successfully")
    } catch (error) {
        next(error)
    }
}

export const updateUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { userId } = req.params
        const { role } = updateUserRoleSchema.parse(req.body ?? {})

        const updatedUser = await authService.updateUserRole(userId as string, role)

        sendSuccess(res, updatedUser, "User role updated successfully")
    } catch (error) {
        next(error)
    }
}
