import crypto from "node:crypto"
import { getRedisClient } from "@LCArena/config"
import { logger } from "@LCArena/utils"

const OTP_TTL_SECONDS = 300 // 5 minutes

const otpKey = (email: string): string => `otp:${email.trim().toLowerCase()}`

export const generateAndSaveOtp = async (email: string): Promise<string> => {
    // Generate a secure 6-digit numeric OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString()

    const key = otpKey(email)
    await getRedisClient().set(key, otp, { EX: OTP_TTL_SECONDS })

    logger.info(`[OTP Service] Generated OTP for ${email}: ${otp}`)

    return otp
}

export const verifyOtp = async (
    email: string,
    otp: string
): Promise<boolean> => {
    const key = otpKey(email)
    const storedOtp = await getRedisClient().get(key)

    if (!storedOtp || storedOtp !== otp.trim()) {
        return false
    }

    // Single-use: delete once verified
    await getRedisClient().del(key)
    return true
}
