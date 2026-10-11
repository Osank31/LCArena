// executionResult.type.ts

export type ExecutionStatus = "SUCCESS" | "COMPILE_ERROR" | "INTERNAL_ERROR";

export interface FailedCases {
	tle: string[]; // Time Limit Exceeded (array of test case folder names)
	re: string[]; // Runtime Error
	wa: string[]; // Wrong Answer
}

export interface CompileErrorResult {
	status: "COMPILE_ERROR";
	compileError: string;
}

export interface ExecutionSuccessResult {
	status: "SUCCESS";
	passed: number;
	total: number;
	failedCases: FailedCases;
	executionTimeMs: any;
}

export interface PendingResult {
	status: "PENDING"
}

/**
 * Terminal outcome used when the evaluation pipeline itself fails (Docker
 * unavailable, test cases could not be acquired, persistence errors, ...).
 *
 * It exists so an infrastructure failure is never recorded as a misleading
 * `SUCCESS`/`WRONG_ANSWER` and never leaves a submission stuck on `PENDING`.
 */
export interface InternalErrorResult {
	status: "INTERNAL_ERROR";
	message: string;
}

// The exported union type
export type ExecutionResult =
	| CompileErrorResult
	| ExecutionSuccessResult
	| PendingResult
	| InternalErrorResult;
