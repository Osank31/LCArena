// services/problem.service.ts

import mongoose from "mongoose";
import {Problem} from "@LCArena/models"
import {
    BadRequestError,
    NotFoundError,
    NotImplementedError,
} from "@LCArena/utils";
import { createProblemType, updateProblemType } from "../validations/problem.validation.js";
// import { createEmbedding } from "../utils/openai.embedding.js";

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
    data: updateProblemType
) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Provided id isn't valid");
    }

    const updatedProblem = await Problem.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });

    if (!updatedProblem) {
        throw new NotFoundError("Problem not found or couldn't be updated");
    }

    return updatedProblem;
};

export const deleteProblemService = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid id provided");
    }

    const deletedProblem = await Problem.findByIdAndDelete(id);

    if (!deletedProblem) {
        throw new NotFoundError("Problem not found or couldn't be deleted");
    }

    return deletedProblem;
};

// export const searchProblemsService = async (query: string) => {
//     if (!query || query.trim() === "") {
//         throw new BadRequestError("Invalid Query");
//     }
//     const queryEmbedding = await createEmbedding(query)

//     const results = await Problem.aggregate([
//         {
//             $vectorSearch: {
//                 index: "vector_index",
//                 path: "embedding",
//                 queryVector: queryEmbedding,
//                 numCandidates: 100,
//                 limit: 10
//             }
//         },
//         {
//             $project: {
//                 title: 1,
//                 description: 1,
//                 difficulty: 1,
//                 editorial: 1,
//                 score: { $meta: "vectorSearchScore" }
//             }
//         }
//     ]);
//     return results
// };