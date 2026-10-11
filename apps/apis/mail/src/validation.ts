import { z } from "zod";

export const sendOtpEmailSchema = z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export type SendOtpEmailInput = z.infer<typeof sendOtpEmailSchema>;
