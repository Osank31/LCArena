import { z } from "zod";

export const MailDataSchema = z.object({
  email: z.string().email("Invalid email address"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(255, "Subject is too long"),
  body: z
    .string()
    .min(1, "Body is required"),
  from: z.string().email("Invalid sender email address"),
});

export type IMailData = z.infer<typeof MailDataSchema>;