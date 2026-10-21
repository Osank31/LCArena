import express, {
    type Express,
    type NextFunction,
    type Request,
    type Response,
} from "express";
import { appErrorHandler } from "@LCArena/middlewares";
import { UnauthorizedError } from "@LCArena/utils";
import { createOtpController } from "./controller";
import {
    createDispatcher,
    type DispatcherOptions,
    type MailDispatcher,
} from "./dispatcher";
import { type Mailer } from "./mailer";

export interface AppOptions {
    /**
     * When set, `/otp` requires `x-mail-service-token` to match. This keeps the
     * relay from being used as an open email sender by anything that can reach
     * the service.
     */
    token?: string;
    /**
     * Background delivery queue. Injected by `index.ts` so the process can drain
     * it on shutdown; omitting it builds one around the supplied mailer.
     */
    dispatcher?: MailDispatcher;
    /** Only used when `dispatcher` is omitted. */
    dispatcherOptions?: DispatcherOptions;
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
    const dispatcher =
        options.dispatcher ??
        createDispatcher(mailer, options.dispatcherOptions);

    app.disable("x-powered-by");
    app.use(express.json());

    // Liveness stays open so orchestrators can probe the pod. Queue depth is
    // included because delivery now happens after the response is sent: a
    // growing backlog is the first sign a relay is unhealthy.
    app.get("/health", (_req, res) => {
        res.status(200).json({
            message: "Mail Service Healthy",
            queued: dispatcher.queued,
            inFlight: dispatcher.inFlight,
        });
    });

    if (options.token) {
        app.post("/otp", requireToken(options.token), createOtpController(dispatcher));
    } else {
        app.post("/otp", createOtpController(dispatcher));
    }

    app.use(appErrorHandler);

    return app;
};
