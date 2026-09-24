import { type NextFunction, type Request, type Response } from "express";
import { createProblemSchema, updateProblemSchema } from "./validation";
import {createProblemService, getAllProblemsService, getSingleProblemService, deleteProblemService, updateProblemService} from "./service"
import {logger, sendSuccess} from "@LCArena/utils"

export const createProblem = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const validatedData = createProblemSchema.parse(req.body);

        const problem = await createProblemService(validatedData);

        return sendSuccess(
            res,
            problem,
            "Problem Created Successfully",
            201
        );
    } catch (error: any) {
        logger.error(error.message);
        next(error);
    }
};

export const getAllProblems = async (
    _: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const problems = await getAllProblemsService();

        return sendSuccess(
            res,
            problems,
            "Problems fetched successfully",
            200
        );
    } catch (error: any) {
        logger.error(error.message);
        next(error);
    }
};

export const getSingleProblem = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;

        const problem = await getSingleProblemService(id as string);

        return sendSuccess(
            res,
            problem,
            "Problem fetched successfully"
        );
    } catch (error: any) {
        logger.error(error.message);
        next(error);
    }
};

export const updateProblem = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;

        const validatedData = updateProblemSchema.parse(req.body);

        const updatedProblem = await updateProblemService(
            id as string,
            validatedData
        );

        return sendSuccess(
            res,
            updatedProblem,
            "Problem updated successfully"
        );
    } catch (error: any) {
        logger.error(error.message);
        next(error);
    }
};

export const deleteProblem = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;

        const deletedProblem = await deleteProblemService(id as string);

        return sendSuccess(
            res,
            deletedProblem,
            "Problem deleted successfully"
        );
    } catch (error: any) {
        logger.error(error.message);
        next(error);
    }
};