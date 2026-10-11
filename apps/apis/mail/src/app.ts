import express, {
    type Express,
    type NextFunction,
    type Request,
    type Response,
} from "express";
import { appErrorHandler } from "@LCArena/middlewares";
import { UnauthorizedError } from "@LCArena/utils";
import { createOtpController } from "./controller";
import { type Mailer } from "./mailer";

export interface AppOptions {
    /**
     * When set, `/otp` requires `x-mail-service-token` to match. This keeps the
     * relay from being used as an open email sender by anything that can reach
     * the service.
     */
    token?: string;
}

const requireToken =
    (token: string) =>
    (req: Request, _res: Response, next: NextFunction): void => {
        if (req.header("x-mail-service-token") !== token) {
            next(new UnauthorizedError("Invalid or missing mail service token"));
            return;
        }

        next();
    };

/**
 * `mailer` is injected so the app can be exercised with an in-process SMTP
 * sink in tests instead of a real relay.
 */
export const createApp = (mailer: Mailer, options: AppOptions = {}): Express => {
    const app = express();

    app.disable("x-powered-by");
    app.use(express.json());

    // Liveness stays open so orchestrators can probe the pod.
    app.get("/health", (_req, res) => {
        res.status(200).json({ message: "Mail Service Healthy" });
    });

    if (options.token) {
        app.post("/otp", requireToken(options.token), createOtpController(mailer));
    } else {
        app.post("/otp", createOtpController(mailer));
    }

    app.use(appErrorHandler);

    return app;
};
