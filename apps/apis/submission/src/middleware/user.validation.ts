import { NextFunction, Request, Response } from "express"

export const userValidation = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const rawUserId = req.headers["x-user-id"]

        if (!rawUserId || typeof rawUserId !== "string") {
            return res.status(401).json({ message: "Missing user header" })
        }

        const userId = rawUserId.replace(/"/g, "")

        req.user = {
            userId,
        }

        next()
    } catch (error) {
        next(error)
    }
}