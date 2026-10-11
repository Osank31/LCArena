import { ExecutionResult, Executor } from "../executor/index.js";
import { logger } from "@LCArena/utils";
import Docker from "dockerode";

export class JSExecutor extends Executor {
	private static IMAGE_NAME = "node:20-slim";

	constructor(testCasesDir?: string) {
		super(testCasesDir);
	}

	private getWrapperCode(): string {
		return `
const fs = require('fs');
const { Solution } = require('./solution.js');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (input.length === 0 || input[0] === '') return;
    
    let idx = 0;
    while (idx < input.length) {
        const n = parseInt(input[idx++], 10);
        const points = [];
        for (let i = 0; i < n; i++) {
            points.push([parseInt(input[idx++], 10), parseInt(input[idx++], 10)]);
        }
        
        const sol = new Solution();
        console.log(sol.solve(points));
    }
}

main();
`;
	}

	async execute(
		clientCode: string,
		time_limit: number,
		testcases_dir: string
	): Promise<ExecutionResult> {
		const mainJSCode = this.getWrapperCode();

		const runnerScript = this.generateRunnerScript(
			time_limit,
			testcases_dir,
			`node -c solution.js`,
			`node main.js`
		);

		const mainBase64 = Buffer.from(mainJSCode).toString("base64");
		const solutionBase64 = Buffer.from(clientCode).toString("base64");
		const bashBase64 = Buffer.from(runnerScript).toString("base64");

		let container: Docker.Container | null = null;

		try {
			await this.pullImage(JSExecutor.IMAGE_NAME);

			logger.debug("Creating fresh container for execution...");
			container = await Executor.docker.createContainer({
				Image: JSExecutor.IMAGE_NAME,
				Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
				WorkingDir: "/workspace",
				HostConfig: {},
			});

			await container.start();

			await this.copyTestCasesToContainer(container);

			await this.runCommand(
				container,
				`echo "${mainBase64}" | base64 -d > /workspace/main.js`
			);
			await this.runCommand(
				container,
				`echo "${solutionBase64}" | base64 -d > /workspace/solution.js`
			);
			await this.runCommand(
				container,
				`echo "${bashBase64}" | base64 -d > /workspace/runner.sh && chmod +x /workspace/runner.sh`
			);

			logger.debug("Running test cases inside container...");
			const output = await this.runCommand(container, `./runner.sh`);

			return this.parseRunnerOutput(output);
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

