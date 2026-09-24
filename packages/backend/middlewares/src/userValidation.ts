import { type NextFunction, type Request, type Response } from "express"
import {User, UserType} from "@LCArena/models"
import {NotFoundError} from "@LCArena/utils"

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string,
                userRole?: UserType
            }
        }
    }
}

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

        const user = await User.findById(userId)

        if (!user) {
            throw new NotFoundError("User not found")
        }

        req.user = {
            userId,
            userRole: user.userType
        }

        next()
    } catch (error) {
        next(error)
    }
}