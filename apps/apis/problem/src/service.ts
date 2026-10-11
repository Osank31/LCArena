import { Problem } from "@LCArena/models";
import mongoose from "mongoose";
import {
    BadRequestError,
    InternalServerError,
    NotFoundError,
    logger,
} from "@LCArena/utils";
import {
    ensureBucketExists,
    getBucketName,
    getProblemTestCasePrefix,
    getTestCaseInputKey,
    getTestCaseOutputKey,
    putObject,
    deleteObjectsWithPrefix,
} from "@LCArena/config";
import {
    type createProblemType,
    type updateProblemType,
    type TestCaseItem,
} from "./validation.js";

async function uploadProblemTestCases(
    problemId: string,
    testCases: TestCaseItem[]
): Promise<{ prefix: string; storageRef: string; uploadedKeys: string[] }> {
    await ensureBucketExists();

    const prefix = getProblemTestCasePrefix(problemId);
    const bucket = getBucketName();
    const storageRef = `s3://${bucket}/${prefix}`;
    const uploadedKeys: string[] = [];

    try {
        for (let i = 0; i < testCases.length; i++) {
            const index = i + 1;
            const tc = testCases[i];
            const inputKey = getTestCaseInputKey(problemId, index);
            const outputKey = getTestCaseOutputKey(problemId, index);

            // Preserve input and output contents exactly, including whitespace and newlines
            await putObject(inputKey, tc.input, "text/plain; charset=utf-8");
            uploadedKeys.push(inputKey);

            await putObject(outputKey, tc.output, "text/plain; charset=utf-8");
            uploadedKeys.push(outputKey);
        }

        logger.info(
            `Successfully uploaded ${testCases.length} test cases for problem ${problemId} to ${storageRef}`
        );

        return { prefix, storageRef, uploadedKeys };
    } catch (error: any) {
        logger.error(
            `Failed uploading test cases for problem ${problemId}. Cleaning up uploaded objects...`,
            error
        );
        // Compensating cleanup: remove any objects uploaded during this failed batch
        await deleteObjectsWithPrefix(prefix).catch((cleanupErr) =>
            logger.error("Compensating cleanup failed:", cleanupErr)
        );
        throw new InternalServerError(
            `Failed to upload problem test cases to object storage: ${error?.message || error}`
        );
    }
}

export const createProblemService = async (data: createProblemType) => {
    if (data.testCases && data.testCases.length > 0) {
        const problemId = new mongoose.Types.ObjectId();
        const idString = String(problemId);

        // Upload test cases to S3-compatible storage first
        const { prefix, storageRef } = await uploadProblemTestCases(
            idString,
            data.testCases
        );

        try {
            const problem = await Problem.create({
                _id: problemId,
                description: data.description,
                difficulty: data.difficulty,
                time_limit: data.time_limit ?? 5000,
                sampleTestCaseUrl:
                    data.sampleTestCaseUrl ||
                    `${storageRef}test_case_001/input.in`,
                testCasesUrl: data.testCasesUrl || storageRef,
                testCaseStoragePrefix: prefix,
                testCasesCount: data.testCases.length,
            });

            return problem;
        } catch (dbError: any) {
            logger.error(
                `Failed persisting problem ${idString} to database. Cleaning up uploaded test cases...`,
                dbError
            );
            await deleteObjectsWithPrefix(prefix).catch((cleanupErr) =>
                logger.error("Compensating S3 cleanup failed:", cleanupErr)
            );
            throw dbError;
        }
    }

    // Fallback path when testCasesUrl is directly supplied
    return await Problem.create({
        description: data.description,
        difficulty: data.difficulty,
        time_limit: data.time_limit ?? 5000,
        sampleTestCaseUrl: data.sampleTestCaseUrl || data.testCasesUrl,
        testCasesUrl: data.testCasesUrl!,
        testCasesCount: 0,
    });
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

    const existing = await Problem.findById(id);
    if (!existing) {
        throw new NotFoundError("Problem not found");
    }

    let storageUpdate: Record<string, any> = {};

    if (data.testCases && data.testCases.length > 0) {
        const prefix =
            existing.testCaseStoragePrefix || getProblemTestCasePrefix(id);

        // Remove old test cases safely
        await deleteObjectsWithPrefix(prefix).catch((err) =>
            logger.warn(
                `Failed removing existing test cases before update for problem ${id}:`,
                err
            )
        );

        const uploadResult = await uploadProblemTestCases(id, data.testCases);
        storageUpdate = {
            testCaseStoragePrefix: uploadResult.prefix,
            testCasesCount: data.testCases.length,
            testCasesUrl: uploadResult.storageRef,
        };
    }

    const updatePayload = {
        ...data,
        ...storageUpdate,
    };
    // Don't persist raw testCases array directly to MongoDB problem document
    delete (updatePayload as any).testCases;

    const updatedProblem = await Problem.findByIdAndUpdate(id, updatePayload, {
        returnDocument: "after",
        runValidators: true,
    });

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

    // Safely remove associated test cases from object storage
    const prefix =
        deletedProblem.testCaseStoragePrefix || getProblemTestCasePrefix(id);
    await deleteObjectsWithPrefix(prefix).catch((err) => {
        logger.warn(
            `Failed to remove test cases for deleted problem ${id}:`,
            err
        );
    });

    return deletedProblem;
};