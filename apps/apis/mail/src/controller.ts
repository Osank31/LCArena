import { type NextFunction, type Request, type Response } from "express";
import { sendSuccess } from "@LCArena/utils";
import { type Mailer } from "./mailer";
import { buildOtpEmail } from "./templates";
import { sendOtpEmailSchema } from "./validation";

export const createOtpController =
    (mailer: Mailer) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, otp } = sendOtpEmailSchema.parse(req.body ?? {});

            await mailer.send({ to: email, ...buildOtpEmail(otp) });

            sendSuccess(res, null, "OTP email sent successfully");
        } catch (error) {
            next(error);
        }
    };
