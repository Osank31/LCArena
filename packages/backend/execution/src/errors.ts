/**
 * Raised when the test-case directory handed to an executor cannot be read or
 * contains no usable test cases. Callers must treat this as an infrastructure
 * failure (the submission must not be reported as `SUCCESS` with zero tests).
 */
export class TestCasesUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TestCasesUnavailableError";
	}
}
