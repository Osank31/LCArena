import mongoose, { type HydratedDocument } from "mongoose"
import { User, type IUser, type IUserMethods, type UserType } from "@LCArena/models"
import { BadRequestError, NotFoundError, UnauthorizedError } from "@LCArena/utils"
import * as otpService from "./otp.service"
import { mailClient } from "./mail.service"
import {
    isSessionActive,
    revokeAccessToken,
    revokeSession,
    saveSession,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "./token.service"
import type {
    ChangePasswordInput,
    LoginInput,
    LoginOtpInput,
    RegisterWithOtpInput,
} from "../validation/auth.validation"

type UserDocument = HydratedDocument<IUser, IUserMethods>

export interface PublicUser {
    id: string
    name: string
    email: string
    profilePicUrl: string
    userType: UserType
    roleExpiry: Date | null
}

/**
 * Builds the response shape explicitly rather than spreading the document, so a
 * new sensitive field on the user schema can never leak by accident.
 */
export const toPublicUser = (user: UserDocument): PublicUser => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    profilePicUrl: user.profilePicUrl,
    userType: user.userType,
    roleExpiry: user.roleExpiry ?? null,
})

const issueTokens = async (user: UserDocument) => {
    const userId = String(user._id)

    const accessToken = signAccessToken({
        userId,
        email: user.email,
        name: user.name,
        userRole: user.userType,
    })
    const refreshToken = signRefreshToken(userId)

    await saveSession(userId, refreshToken)

    return { accessToken, refreshToken }
}

export const sendOtp = async (email: string): Promise<void> => {
    const otp = await otpService.generateAndSaveOtp(email)

    // Persist first, then deliver. Delivery is best-effort: a mail-provider
    // outage is logged but does not fail the request, so `/auth/send-otp`
    // cannot be used as an oracle for which accounts exist or for provider
    // health. The user can simply request a new code.
    await mailClient.notifyOtp({ email, otp })
}

export const registerWithOtp = async (data: RegisterWithOtpInput) => {
    const { email, password, name, otp } = data

    const isValidOtp = await otpService.verifyOtp(email, otp)
    if (!isValidOtp) {
        throw new BadRequestError("Invalid or expired OTP")
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new BadRequestError("User with this email already exists")
    }

    const user = await User.create({
        email,
        password,
        name,
        profilePicUrl: "/default-url",
    })

    const tokens = await issueTokens(user)

    return { user: toPublicUser(user), ...tokens }
}

export const loginWithOtp = async (data: LoginOtpInput) => {
    const { email, otp } = data

    const isValidOtp = await otpService.verifyOtp(email, otp)
    if (!isValidOtp) {
        throw new UnauthorizedError("Invalid or expired OTP")
    }

    const user = await User.findOne({ email })
    if (!user) {
        throw new UnauthorizedError("User not found")
    }

    const tokens = await issueTokens(user)

    return { user: toPublicUser(user), ...tokens }
}

export const login = async (data: LoginInput) => {
    const { email, password } = data

    const user = await User.findOne({ email })

    // Unknown email and wrong password return the exact same error, so the
    // response cannot be used to work out which accounts exist.
    const invalidCredentials = new UnauthorizedError("Invalid email or password")

    if (!user) throw invalidCredentials

    const passwordMatches = await user.comparePassword(password)
    if (!passwordMatches) throw invalidCredentials

    const tokens = await issueTokens(user)

    return { user: toPublicUser(user), ...tokens }
}

export const refresh = async (refreshToken: string) => {
    let payload

    try {
        payload = verifyRefreshToken(refreshToken)
    } catch {
        throw new UnauthorizedError("Invalid or expired refresh token")
    }

    if (!(await isSessionActive(payload.userId, refreshToken))) {
        throw new UnauthorizedError("Session is no longer active")
    }

    const user = await User.findById(payload.userId)

    if (!user) {
        await revokeSession(payload.userId)
        throw new UnauthorizedError("User no longer exists")
    }

    // Rotation: the presented refresh token stops working as soon as a new one
    // is issued, because `issueTokens` overwrites the stored session value.
    const tokens = await issueTokens(user)

    return { user: toPublicUser(user), ...tokens }
}

export const logout = async (
    refreshToken: string | undefined,
    accessToken: string | undefined
) => {
    if (refreshToken) {
        try {
            const { userId } = verifyRefreshToken(refreshToken)

            // Only drop the session if this token is the one currently stored:
            // otherwise anyone holding a stale token could sign the real user out.
            if (await isSessionActive(userId, refreshToken)) {
                await revokeSession(userId)
            }
        } catch {
            // Expired or forged refresh tokens cannot open a session anyway.
        }
    }

    if (accessToken) {
        await revokeAccessToken(accessToken)
    }
}

export const getProfile = async (userId: string): Promise<PublicUser> => {
    const user = await User.findById(userId)

    if (!user) throw new UnauthorizedError("User no longer exists")

    return toPublicUser(user)
}

export const changePassword = async (
    userId: string,
    data: ChangePasswordInput
): Promise<void> => {
    const user = await User.findById(userId)

    if (!user) throw new UnauthorizedError("User no longer exists")

    const passwordMatches = await user.comparePassword(data.currentPassword)
    if (!passwordMatches) {
        throw new BadRequestError("Current password is incorrect")
    }

    user.password = data.newPassword
    await user.save()
}

export const deleteAccount = async (
    userId: string,
    password?: string
): Promise<void> => {
    const user = await User.findById(userId)

    if (!user) throw new UnauthorizedError("User no longer exists")

    if (password) {
        const passwordMatches = await user.comparePassword(password)
        if (!passwordMatches) {
            throw new UnauthorizedError("Incorrect password")
        }
    }

    await User.findByIdAndDelete(userId)
    await revokeSession(userId)
}

export const updateUserRole = async (
    userId: string,
    role: UserType
): Promise<PublicUser> => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new BadRequestError("Invalid user id")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new NotFoundError("User not found")
    }

    user.userType = role
    await user.save()

    return toPublicUser(user)
}
