import { Response } from "express";

export function sendSuccess<T>(res: Response, data?: T, message="Success", status: number=200) {
    return res.status(status).json({
        status,
        message,
        success: true,
        data,
        error: null
    })
}

export function sendError<T>(res: Response, message="Something went wrong", status=500, error: string | null = null) {
    return res.status(status).json({
        status,
        message,
        success: false, 
        data: null,
        error
    })
}