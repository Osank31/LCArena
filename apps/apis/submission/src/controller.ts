import { type NextFunction, type Request, type Response } from "express"
import { createSubmissionSchema, updateSubmissionSchema } from "./validations";
import { BadRequestError, sendSuccess } from "@LCArena/utils";
import mongoose from "mongoose"
import { evaluationService, updateSubmissionService } from "./service";

export const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = createSubmissionSchema.parse(req.body)

        if (!mongoose.Types.ObjectId.isValid(validatedData.problemId)) {
            throw new BadRequestError("Invalid problem id")
        }

        const userId = req.user!.userId

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