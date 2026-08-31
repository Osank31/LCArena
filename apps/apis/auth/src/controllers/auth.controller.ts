import { CookieOptions, NextFunction, Request, Response } from "express"
import { loginUserSchema, registerUserSchema, sendMailSchema, updateUserSchema } from "../validation/auth.validation.js"
import { sendSuccess } from "@LCArena/utils"
import * as AuthService from '../service/auth.service.js'
import * as PasswordService from '../service/password.service.js'
import { BadRequestError, UnauthorizedError } from "@LCArena/utils"

export const sendEmail = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const validatedData = sendMailSchema.parse(req.body)
    
        const {email} = validatedData
    
        await AuthService.sendEmail({email})
    
        sendSuccess(res, null, "Otp generated successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const signUp = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const validatedData = registerUserSchema.parse(req.body)
    
        const {name, email, password, otp, profilePicUrl} = validatedData
        
        if(!otp){
            throw new BadRequestError("Otp required")
        }
    
        const newUser = await AuthService.signUp({name, email, password, otp, profilePicUrl})
    
        const cookieOptions: CookieOptions = {
            expires: new Date(Date.now() + 7*24*60*60*1000),
            httpOnly: true
        }
    
        res.cookie("refreshToken", newUser.refreshToken, cookieOptions).status(201).json({
            success: true,
            message: "User sign up successful",
            data: {...newUser, refreshToken: null}
        })
    
    } catch (error) {
        next(error)    
    }
}

export const login = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const validatedData = loginUserSchema.parse(req.body)

        const {email, password} = validatedData

        const user = await AuthService.login({email, password})

        const cookieOptions: CookieOptions = {
            expires: new Date(Date.now() + 7*24*60*60*1000),
            httpOnly: true
        }

        res.cookie("refreshToken", user.refreshToken, cookieOptions).status(201).json({
            success: true,
            message: "User sign up successful",
            data: {...user, refreshToken: null}
        })
    } catch (error) {
        next(error)
    }
}

export const forgetPassword = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const {email} = req.body

        if (!email){
            throw new BadRequestError("Email not found in forgetPassword")
        }
        
        await PasswordService.forgotPassword({email})

        sendSuccess(res, null, "Otp Generated Successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const forgotPasswordVerifyOtp = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const {email, otp} = req.body

        if(!email || !otp) {
            throw new BadRequestError("email or otp not found in forgotPasswordVerifyOtp")
        }

        const updatedUser = await PasswordService.forgotPasswordVerifyOtp({email, otp})

        sendSuccess(res, updatedUser, "Token generated successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const {password, token} = req.body

        if (!password || !token) {
            throw new BadRequestError("Password or token not found")
        }

        const updatedUser = await PasswordService.resetPassword({password, token})

        sendSuccess(res, updatedUser, "Password reset succkessfully", 201)
    } catch (error) {
        next(error)        
    }
}

export const reloadToken = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const refreshToken: string = req.cookies?.refreshToken

        if (!refreshToken) {
            throw new UnauthorizedError("Refresh token not found")
        }

        const tokens = await AuthService.reloadToken({refreshToken})

        const cookieOptions: CookieOptions = {
            expires: new Date(Date.now() + 7*24*60*60*1000),
            httpOnly: true
        }

        res.cookie("refreshToken", tokens.newRefreshToken, cookieOptions).status(201).json({
            success: true,
            message: "Tokens reloaded successfully",
            data: {
                accessToken: tokens.accessToken
            }
        });
        
    } catch (error) {
        next(error)
    }
}

export const logout = async (req: Request, res: Response, next: NextFunction)=>{
    try {
        const refreshToken = req.cookies?.refreshToken

        if (!refreshToken) {
            throw new BadRequestError("Refresh token not found")
        }

        await AuthService.logout({refreshToken})

        res.clearCookie("refreshToken")

        sendSuccess(res, null, "Logout successful")
    } catch (error) {
        next(error)
    }
}