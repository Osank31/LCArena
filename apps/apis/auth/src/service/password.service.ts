import {User} from "@LCArena/models";
import { ForbiddenError, InternalServerError, NotFoundError } from "@LCArena/utils";
import otpGenerator from "otp-generator"
import { getRedisClient } from "@LCArena/config";
import { mailTemplate } from "../templates/mail.template.js";
import axios from "axios";
import { MAIL_SERVICE_URL } from "../constants/constants.js";
import crypto from "node:crypto"


export interface IForgotPasswordData {
    email: string;
}

export interface IForgotPasswordVerifyOtpData extends IForgotPasswordData {
    otp: string;
}

export interface IResetPasswordData {
    password: string;
    token: string;
}

export const forgotPassword = async(data: IForgotPasswordData) => {
    const {email} = data

    const user = await User.findOne({email})

    if(!user) {
        throw new NotFoundError("User not found")
    }

    const otp = otpGenerator.generate(4, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });

    const redisClient= getRedisClient()

    const newOtp = await redisClient.set(`forgotPassword_otp${email}`, otp, {EX: 300})

    const mailData = {
        email,
        from: "Leetcode",
        subject: "Otp Verification",
        body: mailTemplate(otp)
    }

    const response = await axios.post(MAIL_SERVICE_URL, mailData)

    if (!response.data.success) {
        throw new InternalServerError("Mail service problem")
    }


}

export const forgotPasswordVerifyOtp = async(data: IForgotPasswordVerifyOtpData) => {
    const {email, otp} = data

    const redisClient=getRedisClient()
    const savedOtp = await redisClient.get(`forgotPassword_otp${email}`)
    
    if (!savedOtp || savedOtp !== otp) {
        throw new NotFoundError("Otp not found")
    }

    const token = crypto.randomBytes(32).toString("hex")

    const updatedUser = await User.findOneAndUpdate({email}, {
        resetPasswordToken: token,
        resetTokenExpiry: new Date(Date.now() + 10*60*1000)
    }, {new: true}).select("-password")

    return updatedUser
}

export const resetPassword = async (data: IResetPasswordData )=> {
    const {token, password} = data;

    const user = await User.findOne({resetPasswordToken: token})

    if (!user){
        throw new NotFoundError("User not found")
    }

    if (user.resetTokenExpiry < String(Date.now())) {
        throw new ForbiddenError("Session expired")
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, {
        password,
        resetPasswordToken: "",
        resetTokenExpiry: ""
    }, {new: true}).select("-password")

    return updatedUser
}