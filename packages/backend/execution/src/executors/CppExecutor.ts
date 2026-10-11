import { ExecutionResult, Executor } from "../executor/index.js";
import { logger } from "@LCArena/utils";
import Docker from "dockerode";

export class CPPExecutor extends Executor {
	private static IMAGE_NAME = "gcc:latest";

	constructor(testCasesDir?: string) {
		super(testCasesDir);
	}

	private getWrapperCode(solutionFile: string): string {
		const cppPrefix = `
#include <bits/stdc++.h>
using namespace std;
`;
		const cppSuffix = `
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    while (cin >> n) {
        vector<vector<int>> points(n, vector<int>(2));
        for (int i = 0; i < n; ++i) {
            cin >> points[i][0] >> points[i][1];
        }
        
        Solution sol;
        cout << sol.solve(points) << "\\n";
    }
    
    return 0;
}
`;
		return `${cppPrefix}\n\n#include "${solutionFile}.cpp"\n\n${cppSuffix}`;
	}

	async execute(
		clientCode: string,
		time_limit: number,
		testcases_dir: string
	): Promise<ExecutionResult> {
		const Main_file = "Main";
		const Solution_file = "Solution";
		const Runner_file = "runner";

		const finalCppCode = this.getWrapperCode(Solution_file);

		const runnerScript = this.generateRunnerScript(
			time_limit,
			testcases_dir,
			`g++ -O3 -std=c++17 "${Main_file}.cpp" -o "./solution"`,
			`./solution`
		);

		const cppBase64 = Buffer.from(finalCppCode).toString("base64");
		const mainBase64 = Buffer.from(clientCode).toString("base64");
		const bashBase64 = Buffer.from(runnerScript).toString("base64");

		let container: Docker.Container | null = null;

		try {
			await this.pullImage(CPPExecutor.IMAGE_NAME);

			logger.debug("Creating fresh container for execution...");
			container = await Executor.docker.createContainer({
				Image: CPPExecutor.IMAGE_NAME,
				Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
				WorkingDir: "/workspace",
				HostConfig: {},
			});

			await container.start();

			await this.copyTestCasesToContainer(container);

			await this.runCommand(
				container,
				`echo "${cppBase64}" | base64 -d > /workspace/${Main_file}.cpp`
			);
			await this.runCommand(
				container,
				`echo "${mainBase64}" | base64 -d > /workspace/${Solution_file}.cpp`
			);
			await this.runCommand(
				container,
				`echo "${bashBase64}" | base64 -d > /workspace/${Runner_file}.sh && chmod +x /workspace/${Runner_file}.sh`
			);

			logger.debug("Running test cases inside container...");
			const output = await this.runCommand(
				container,
				`./${Runner_file}.sh`
			);

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

