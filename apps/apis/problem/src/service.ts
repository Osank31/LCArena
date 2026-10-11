import {Problem} from "@LCArena/models";
import mongoose from "mongoose"
import {
    BadRequestError,
    NotFoundError,
} from "@LCArena/utils";
import { type createProblemType } from "./validation.js";

export const createProblemService = async (data: createProblemType) => {
    return await Problem.create(data);
};

export const getAllProblemsService = async () => {
    return await Problem.find();
};

export const getSingleProblemService = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Provided id isn't valid");
    }

    const problem = await Problem.findById(id);

    if (!problem) {
        throw new NotFoundError("Problem not found");
    }

    return problem;
};

export const updateProblemService = async (
    id: string,
    data: any
) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Provided id isn't valid");
    }

    const updatedProblem = await Problem.findByIdAndUpdate(id, data, {
        returnDocument: "after",
        runValidators: true,
    });

    if (!updatedProblem) {
        throw new NotFoundError("Problem not found");
    }

    return updatedProblem;
};

export const deleteProblemService = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid id provided");
    }

    const deletedProblem = await Problem.findByIdAndDelete(id);

    if (!deletedProblem) {
        throw new NotFoundError("Problem not found");
    }

    return deletedProblem;
};