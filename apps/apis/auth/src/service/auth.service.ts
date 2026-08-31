import axios from "axios"
import { getRedisClient } from "@LCArena/config"
import {User} from "@LCArena/models"
import { mailTemplate } from "../templates/mail.template.js"
import { ConflictError, ForbiddenError, InternalServerError, NotFoundError, UnauthorizedError } from "@LCArena/utils"
import otpGenerator from "otp-generator"
import { ACCESS_TOKEN_JWT_KEY, MAIL_SERVICE_URL, REFRESH_TOKEN_JWT_KEY } from "../constants/constants.js"
import { LoginUserInput, registerUserSchema, type RegisterUserInput } from "../validation/auth.validation.js"
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken"
import mongoose from "mongoose"

export interface IReloadToken {
    refreshToken: string
}

export interface IRefreshToken {
    userId: string
}

export interface IAccessToken {
    email: string;
    name: string;
    userId: mongoose.Types.ObjectId;
    userRole: string
}

export interface ILogoutData {
    refreshToken: string;
}

export const sendEmail = async (data: { email: string }) => {
    const { email } = data

    const isPresent = await User.findOne({ email })

    if (isPresent) {
        throw new ForbiddenError("Email already registered")
    }

    const newOtp = otpGenerator.generate(4, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });

    const redisClient = getRedisClient()

    await redisClient.set(`signup_otp:${email}`, newOtp, { EX: 300 })

    const mailData = {
        email,
        from: "osankverma2004@gmail.com",
        subject: "For OTP verification",
        body: mailTemplate(newOtp)
    }

    // call mail service
    const response = await axios.post(MAIL_SERVICE_URL, mailData)

    if (!response.data.success)
        throw new InternalServerError("Couldnt send mail")

    return newOtp
}

export const signUp = async (data: (RegisterUserInput & { otp: string })) => {
    const { name, email, password, otp, profilePicUrl } = data

    const isUserRegistered = await User.findOne({
        email
    })

    if (isUserRegistered) {
        throw new ForbiddenError("Account already Registeresd")
    }

    const redisClient = getRedisClient()

    const latestOtp = await redisClient.get(`signup_otp:${email}`)

    if (!latestOtp) {
        throw new NotFoundError("Otp not found")
    }

    if (latestOtp !== otp) {
        throw new ConflictError("Wrong Otp")
    }

    const newUser = await User.create({
        email, password, name, profilePicUrl
    });

    const payload: IAccessToken = {
        email, name, userId: newUser._id, userRole: newUser.userType
    }

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_JWT_KEY, { expiresIn: "15min" })
    const refreshToken = jwt.sign({ userId: newUser._id }, REFRESH_TOKEN_JWT_KEY, { expiresIn: "7d" })

    await redisClient.set(`session:${payload.userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 })

    const userObj: {
        accessToken: string
        refreshToken: string
        password: null
    } & ReturnType<typeof newUser.toObject> = {
        ...newUser.toObject(),
        accessToken,
        refreshToken,
        password: null,
    }

    return userObj
}

export const login = async (data: LoginUserInput) => {
    const { email, password } = data

    const user = await User.findOne({ email })

    if (!user) {
        throw new NotFoundError("User not found")
    }

    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
        throw new UnauthorizedError("Password not matched")
    }

    const payload: IAccessToken = {
        email,
        name: user.name,
        userId: user._id,
        userRole: user.userType
    }

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_JWT_KEY, { expiresIn: "15min" })
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_TOKEN_JWT_KEY, { expiresIn: "7d" })

    const redisClient = getRedisClient()
    await redisClient.set(`session:${payload.userId}`, refreshToken, { EX: 7 * 24 * 60 * 60 })

    const userObj: {
        accessToken: string
        refreshToken: string
        password: null
    } & ReturnType<typeof user.toObject> = {
        ...user.toObject(),
        accessToken,
        refreshToken,
        password: null,
    }

    return userObj
}

export const reloadToken = async (data: IReloadToken) => {
    const { refreshToken } = data

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_JWT_KEY) as IRefreshToken

    const {userId} = decoded

    const redisClient = getRedisClient()

    const storedToken = await redisClient.get(`session:${userId}`)

    if (!storedToken || storedToken !== refreshToken) {
        throw new ForbiddenError("Session expired")
    }

    const user = await User.findById(userId)

    if (!user){
        throw new NotFoundError("User not found")
    }

    const payload = {
        email: user.email,
        name: user.name,
        userId: user._id,
        userRole: user.userType
    }

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_JWT_KEY, {
        expiresIn: "15min"
    })

    const newRefreshToken = jwt.sign({ userId: payload.userId }, REFRESH_TOKEN_JWT_KEY, {
        expiresIn: "7d"
    })

    await redisClient.set(`session:${payload.userId}`, newRefreshToken, {
        EX: 7 * 24 * 60 * 60
    })

    return { accessToken, newRefreshToken }
}

export const logout = async (data: ILogoutData) => {
    const refreshToken = data.refreshToken

    const decoded: any = jwt.verify(refreshToken, REFRESH_TOKEN_JWT_KEY)

    const { userId } = decoded

    const redisClient = getRedisClient()

    await redisClient.del(`session:${userId}`)

    await redisClient.set(`blacklist:${userId}`, "true", {
        EX: 7*24*60*60
    })
}