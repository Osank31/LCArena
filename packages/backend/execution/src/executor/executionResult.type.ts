// executionResult.type.ts

export type ExecutionStatus = "SUCCESS" | "COMPILE_ERROR";

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

// The exported union type
export type ExecutionResult = CompileErrorResult | ExecutionSuccessResult | PendingResult;
