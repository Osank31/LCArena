import { type NextFunction, type Request, type Response } from "express"
import mongoose from "mongoose"
import { Submission, UserType } from "@LCArena/models"
import { BadRequestError, ForbiddenError, NotFoundError } from "@LCArena/utils"
import { type AuthenticatedUser } from "@LCArena/middlewares"

/**
 * Authorization guard: allows the request only when the submission in the path
 * belongs to the caller, or the caller has Admin privileges.
 */
export const requireSubmissionOwner = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const submissionId = req.params.id

        if (
            typeof submissionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(submissionId)
        ) {
            throw new BadRequestError("Invalid submission id")
        }

        const submission = await Submission.findById(submissionId).select("userId").lean()

        if (!submission) throw new NotFoundError("Submission not found")

        const authenticatedUser: AuthenticatedUser | undefined = req.user
        const isOwner =
            String(submission.userId) === String(authenticatedUser?.userId)
        const isAdmin = authenticatedUser?.userRole === UserType.Admin

        if (!isOwner && !isAdmin) {
            throw new ForbiddenError(
                "You can only access your own submissions"
            )
        }

        next()
    } catch (error) {
        next(error)
    }
}
