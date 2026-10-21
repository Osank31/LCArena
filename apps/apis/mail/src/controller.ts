import { type NextFunction, type Request, type Response } from "express";
import { InternalServerError, sendSuccess } from "@LCArena/utils";
import { type MailDispatcher } from "./dispatcher";
import { buildOtpEmail } from "./templates";
import { sendOtpEmailSchema } from "./validation";

export const createOtpController =
    (dispatcher: MailDispatcher) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, otp } = sendOtpEmailSchema.parse(req.body ?? {});

            // Rendering stays on the request path (it is pure string work); only
            // the SMTP round-trip is deferred, so the caller is not held hostage
            // by the relay's latency.
            const accepted = dispatcher.enqueue({
                to: email,
                ...buildOtpEmail(otp),
            });

            if (!accepted) {
                // Refuse rather than buffer without bound: the caller can retry
                // once the backlog clears, and no OTP is silently dropped.
                next(
                    new InternalServerError(
                        "Mail delivery queue is saturated, retry shortly",
                        503,
                        "Service Unavailable"
                    )
                );
                return;
            }

            sendSuccess(
                res,
                { queued: true },
                "OTP email queued for delivery",
                202
            );
        } catch (error) {
            next(error);
        }
    };
