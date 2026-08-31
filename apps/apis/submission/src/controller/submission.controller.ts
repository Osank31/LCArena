import { NextFunction, Request, Response } from "express";
import { createSubmissionSchema, updateSubmissionSchema } from "../validations/submission.validation.js";
import { sendSuccess } from "@LCArena/utils";
import * as SubmissionService from "../services/submission.service.js";
import { BadRequestError, UnauthorizedError } from "@LCArena/utils";

export const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId

        if(!userId) {
            throw new UnauthorizedError("User not found")
        }

        const validatedData = createSubmissionSchema.parse(req.body)
        const submission = await SubmissionService.evaluationService({...validatedData, userId});

        return sendSuccess(res, submission, "Submission created successfully", 201)
    } catch (error) {
        next(error)
    }
}

export const updateSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {submissionId} = req.params
        const {problemId, code, language, status} = updateSubmissionSchema.parse(req.body)

        if (!submissionId) {
            throw new BadRequestError("Submission Id is required")
        }

        const submission = await SubmissionService.updateSubmission({
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