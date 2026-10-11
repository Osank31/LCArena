import { z } from "zod"
import { UserType } from "@LCArena/models"

export const sendOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
})

export const registerWithOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().trim().min(1, "Name is required"),
    otp: z.string().trim().length(6, "OTP must be 6 digits"),
})

export const loginOtpSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    otp: z.string().trim().length(6, "OTP must be 6 digits"),
})

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

export const refreshSchema = z.object({
    refreshToken: z.string().min(1).optional(),
})

export const logoutSchema = z.object({
    refreshToken: z.string().min(1).optional(),
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export const deleteAccountSchema = z.object({
    password: z.string().optional(),
})

export const updateUserRoleSchema = z.object({
    role: z.nativeEnum(UserType, {
        message: `Role must be one of: ${Object.values(UserType).join(", ")}`,
    }),
})

export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type RegisterWithOtpInput = z.infer<typeof registerWithOtpSchema>
export type LoginOtpInput = z.infer<typeof loginOtpSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
