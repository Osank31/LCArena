import { type NextFunction, type Request, type Response } from "express"
import { createSubmissionSchema, updateSubmissionSchema } from "./validations";
import { BadRequestError, UnauthorizedError, sendSuccess } from "@LCArena/utils";
import mongoose from "mongoose"
import { evaluationService, updateSubmissionService,getSubmissionService } from "./service";

export const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = createSubmissionSchema.parse(req.body)

        if (!mongoose.Types.ObjectId.isValid(validatedData.problemId)) {
            throw new BadRequestError("Invalid problem id")
        }

        const userId = req.user?.userId

        if (!userId) {
            throw new UnauthorizedError("Missing authenticated user")
        }

        const submission = await evaluationService({ ...validatedData, userId });

        return sendSuccess(res, submission, "Submission created successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const updateSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { submissionId } = req.params
        const { problemId, code, language, status } = updateSubmissionSchema.parse(req.body)

        if (!submissionId) {
            throw new BadRequestError("Submission Id is required")
        }

        if (!mongoose.Types.ObjectId.isValid(submissionId as string)) {
            throw new BadRequestError("Invalid submission id")
        }

        if (problemId && !mongoose.Types.ObjectId.isValid(problemId)) {
            throw new BadRequestError("Invalid problem id")
        }

        const submission = await updateSubmissionService({
            problemId,
            code,
            language,
            status,
            submissionId: (submissionId as string)
        });

        sendSuccess(res, submission, "Submission updated successfully")
    } catch (error) {
        next(error)
    }
}

export const getSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { submissionId } = req.params

        if (
            typeof submissionId !== "string" ||
            !mongoose.Types.ObjectId.isValid(submissionId)
        ) {
            throw new BadRequestError("Invalid submission id")
        }

        const submission = await getSubmissionService(submissionId)

        sendSuccess(res, submission, "Submission fetched successfully")
    } catch (error) {
        next(error)
    }
}