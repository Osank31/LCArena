import { ExecutionResult, Executor } from "../executor/index.js";
import { logger } from "@LCArena/utils";
import Docker from "dockerode";

export class JavaExecutor extends Executor {
	private static IMAGE_NAME = "eclipse-temurin";

	constructor() {
		super();
	}

	private getWrapperCode(): string {
		return `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        while (scanner.hasNextInt()) {
            int n = scanner.nextInt();
            int[][] points = new int[n][2];
            for (int i = 0; i < n; i++) {
                points[i][0] = scanner.nextInt();
                points[i][1] = scanner.nextInt();
            }
            
            Solution sol = new Solution();
            System.out.println(sol.solve(points));
        }
        scanner.close();
    }
}
`;
	}

	async execute(
		clientCode: string,
		time_limit: number,
		testcases_dir: string
	): Promise<ExecutionResult> {
		const mainJavaCode = this.getWrapperCode();

		const runnerScript = this.generateRunnerScript(
			time_limit,
			testcases_dir,
			`javac Main.java Solution.java`,
			`java Main`
		);

		const mainBase64 = Buffer.from(mainJavaCode).toString("base64");
		const solutionBase64 = Buffer.from(clientCode).toString("base64");
		const bashBase64 = Buffer.from(runnerScript).toString("base64");

		let container: Docker.Container | null = null;

		try {
			await this.pullImage(JavaExecutor.IMAGE_NAME);

			logger.debug("Creating fresh container for execution...");
			container = await Executor.docker.createContainer({
				Image: JavaExecutor.IMAGE_NAME,
				Cmd: ["/bin/bash", "-c", "tail -f /dev/null"],
				WorkingDir: "/workspace",
				HostConfig: {},
			});

			await container.start();

			await this.copyTestCasesToContainer(container);

			await this.runCommand(
				container,
				`echo "${mainBase64}" | base64 -d > /workspace/Main.java`
			);
			await this.runCommand(
				container,
				`echo "${solutionBase64}" | base64 -d > /workspace/Solution.java`
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
