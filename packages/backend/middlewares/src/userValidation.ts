import { type NextFunction, type Request, type Response } from "express"
import {User} from "@LCArena/models"
import {NotFoundError} from "@LCArena/utils"
// Importing the type also registers the Express.Request.user augmentation.
import { type AuthenticatedUser } from "./express-request.js"

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

        const authenticatedUser: AuthenticatedUser = {
            userId,
            userRole: user.userType
        }

        req.user = authenticatedUser

        next()
    } catch (error) {
        next(error)
    }
}