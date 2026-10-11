import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, logger } from "@LCArena/utils";

export const appErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): any => {
    logger.error(err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: err.issues.map(issue => ({
                path: issue.path,
                message: issue.message
            }))
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    }

    // Malformed JSON bodies (thrown by express.json()) and invalid ObjectId
    // casts are client mistakes, so report them as 4xx instead of 500.
    const clientErrorStatus = err?.statusCode ?? err?.status;

    if (
        typeof clientErrorStatus === "number" &&
        clientErrorStatus >= 400 &&
        clientErrorStatus < 500
    ) {
        return res.status(clientErrorStatus).json({
            success: false,
            message: err.message || "Bad Request"
        });
    }

    if (err?.name === "CastError") {
        return res.status(400).json({
            success: false,
            message: `Invalid value for ${err.path || "field"}`
        });
    }

    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};