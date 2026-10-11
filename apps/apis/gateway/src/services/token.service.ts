import crypto from "node:crypto"
import jwt from "jsonwebtoken"
import { getRedisClient } from "@LCArena/config"
import { type UserType } from "@LCArena/models"
import {
    ACCESS_TOKEN_JWT_KEY,
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_JWT_KEY,
    REFRESH_TOKEN_TTL_SECONDS,
} from "../config/env.config"

export interface AccessTokenPayload {
    userId: string
    email: string
    name: string
    userRole: UserType
    jti: string
}

export interface RefreshTokenPayload {
    userId: string
    jti: string
}

const sessionKey = (userId: string) => `session:${userId}`
const revokedAccessKey = (jti: string) => `revoked_access:${jti}`

export const signAccessToken = (user: {
    userId: string
    email: string
    name: string
    userRole: UserType
}): string =>
    jwt.sign({ ...user, jti: crypto.randomUUID() }, ACCESS_TOKEN_JWT_KEY, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    })

export const signRefreshToken = (userId: string): string =>
    jwt.sign(
        { userId, jti: crypto.randomUUID() },
        REFRESH_TOKEN_JWT_KEY,
        { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
    )

export const verifyAccessToken = (token: string): AccessTokenPayload =>
    jwt.verify(token, ACCESS_TOKEN_JWT_KEY) as AccessTokenPayload

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
    jwt.verify(token, REFRESH_TOKEN_JWT_KEY) as RefreshTokenPayload

export const saveSession = async (
    userId: string,
    refreshToken: string
): Promise<void> => {
    await getRedisClient().set(sessionKey(userId), refreshToken, {
        EX: REFRESH_TOKEN_TTL_SECONDS,
    })
}

export const isSessionActive = async (
    userId: string,
    refreshToken: string
): Promise<boolean> => {
    const stored = await getRedisClient().get(sessionKey(userId))

    return Boolean(stored) && stored === refreshToken
}

export const revokeSession = async (userId: string): Promise<void> => {
    await getRedisClient().del(sessionKey(userId))
}

export const revokeAccessToken = async (token: string): Promise<void> => {
    let decoded: { jti?: string; exp?: number }

    try {
        decoded = jwt.verify(token, ACCESS_TOKEN_JWT_KEY, {
            ignoreExpiration: true,
        }) as { jti?: string; exp?: number }
    } catch {
        return
    }

    if (!decoded.jti || !decoded.exp) return

    const secondsLeft = decoded.exp - Math.floor(Date.now() / 1000)
    if (secondsLeft <= 0) return

    await getRedisClient().set(revokedAccessKey(decoded.jti), "1", {
        EX: secondsLeft,
    })
}

export const isAccessTokenRevoked = async (jti: string): Promise<boolean> =>
    Boolean(await getRedisClient().get(revokedAccessKey(jti)))
