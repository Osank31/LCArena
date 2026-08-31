import { z } from "zod";

export const sendMailSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
})

export const registerUserSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name is required"),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters long"),
    otp: z.string().optional(),
    profilePicUrl: z.string().optional()
});

export const loginUserSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters long"),
});

// Partial schema for update profile / patch routes
export const updateUserSchema = registerUserSchema.partial();

// Optional: require at least one field
export const updateUserWithAtLeastOneFieldSchema =
    updateUserSchema.refine(
        (data) => Object.keys(data).length > 0,
        {
            message: "At least one field is required",
        }
    );

// Types
export type RegisterUserInput = z.infer<
    typeof registerUserSchema
>;

export type LoginUserInput = z.infer<
    typeof loginUserSchema
>;

export type UpdateUserInput = z.infer<
    typeof updateUserSchema
>;