import { CPPExecutor, Executor, JavaExecutor, JSExecutor, PythonExecutor } from "@LCArena/execution";
import { ELanguage, IProblem } from "@LCArena/models";
import { InternalServerError, logger } from "@LCArena/utils";
import axios from "axios";
import { PROBLEM_SERVICE_URL, SUBMISSION_SERVICE_URL } from "./constants";
import { ISubmission } from "@LCArena/models/dist/submission.model";

export type ProcessExecutionParams = {
    problemId: string;
    submissionId: string;
}

export const getExecutor = (language: ELanguage) => {
    switch(language) {
        case ELanguage.cpp:
            return new CPPExecutor()
        case ELanguage.java:
            return new JavaExecutor()
        case ELanguage.py:
            return new PythonExecutor()
        case ELanguage.js:
            return new JSExecutor()
        default:
            logger.error("Language not supported Error")
            return null;
    }
}

export async function processExecution({problemId, submissionId}: ProcessExecutionParams) {
    try {
        const problem: IProblem | null = (await axios.get(`${PROBLEM_SERVICE_URL}/:${problemId}`)) || null
        const submission: ISubmission | null = (await axios.get(`${SUBMISSION_SERVICE_URL}/${submissionId}`)) || null
        if (!problem || !submission) {
            throw new InternalServerError("problem || submission not fetched")
        }

        const testCaseUrl = problem.testCasesUrl

        // download testcases folder from testcases url logic
        const testCasesPath=""

        let executor: Executor | null = getExecutor(submission.language);

        if (!executor) {
            throw new InternalServerError("Executor not initialized")
        }

        const result = await executor.execute(submission.code, problem.time_limit, testCasesPath)

        return result;
    } catch (error) {
        logger.error("Error in process execution")
    }

}