import { NotFoundError, UnauthorizedError } from "@LCArena/utils"
import { type Request, type Response, type NextFunction } from "express"

export const roleValidation = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRole = req.user?.userRole

            if (!userRole) {
                throw new NotFoundError("User Role not found")
            }
            
            if (!allowedRoles.includes(userRole)) {
                throw new UnauthorizedError("This role is not allowed to access this path")
            }

            next()
        } catch (error) {

        }
    }
}