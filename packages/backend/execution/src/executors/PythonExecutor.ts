import { ExecutionResult, Executor } from "../executor/index.js";
import Docker from "dockerode";
import {logger} from "@LCArena/utils"

export class PythonExecutor extends Executor {
	private static IMAGE_NAME = "python:3.11-slim";

	constructor(testCasesDir?: string) {
		super(testCasesDir);
	}

	private getWrapperCode(): string {
		return `
import sys
from solution import Solution

def main():
    # Read all space-separated tokens from stdin
    input_data = sys.stdin.read().split()
    if not input_data:
        return
        
    idx = 0
    while idx < len(input_data):
        n = int(input_data[idx])
        idx += 1
        
        points = []
        for _ in range(n):
            points.append([int(input_data[idx]), int(input_data[idx+1])])
            idx += 2
            
        sol = Solution()
        print(sol.solve(points))

if __name__ == "__main__":
    main()
`;
	}

	async execute(
		clientCode: string,
		time_limit: number,
		testcases_dir: string
	): Promise<ExecutionResult> {
		const mainPythonCode = this.getWrapperCode();

		const runnerScript = this.generateRunnerScript(
			time_limit,
			testcases_dir,
			`python -m py_compile solution.py`,
			`python main.py`
		);

		const mainBase64 = Buffer.from(mainPythonCode).toString("base64");
		const solutionBase64 = Buffer.from(clientCode).toString("base64");
		const bashBase64 = Buffer.from(runnerScript).toString("base64");

		let container: Docker.Container | null = null;

		try {
			await this.pullImage(PythonExecutor.IMAGE_NAME);

			logger.debug("Creating fresh container for execution...");
			container = await Executor.docker.createContainer({
				Image: PythonExecutor.IMAGE_NAME,
				Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
				WorkingDir: "/workspace",
				HostConfig: {},
			});

			await container.start();

			await this.copyTestCasesToContainer(container);

			await this.runCommand(
				container,
				`echo "${mainBase64}" | base64 -d > /workspace/main.py`
			);
			await this.runCommand(
				container,
				`echo "${solutionBase64}" | base64 -d > /workspace/solution.py`
			);
			await this.runCommand(
				container,
				`echo "${bashBase64}" | base64 -d > /workspace/runner.sh && chmod +x /workspace/runner.sh`
			);

			logger.debug("Running test cases inside container...");
			const output = await this.runCommand(container, `./runner.sh`);

			const resultData = JSON.parse(output.trim());
			return resultData;
		} catch (error) {
			logger.error(`Execution failed: ${error}`);
			throw error;
		} finally {
			if (container) {
				logger.debug("Cleaning up container...");
				await container.stop();
				await container.remove();
			}
		}
	}
}

