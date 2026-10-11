import { logger } from "@LCArena/utils";
import Docker from "dockerode";
import fs from "fs/promises";
import path from "path";
import tar from "tar-stream";
import { Writable } from "stream";
import { ExecutionResult } from "./executionResult.type.js";
import { TestCasesUnavailableError } from "../errors.js";

export abstract class Executor {
	static docker: Docker = new Docker();

	/**
	 * Host directory whose *contents* become `/workspace/testcases` inside the
	 * container. Defaults to `<cwd>/testcases` to preserve the original
	 * behaviour, but callers (e.g. the evaluation worker) can point it at an
	 * isolated per-submission workspace so concurrent runs cannot clobber each
	 * other's test files.
	 */
	protected readonly testCasesDir: string;

	constructor(testCasesDir?: string) {
		this.testCasesDir = testCasesDir ?? path.join(process.cwd(), "testcases");
	}

	protected async pullImage(imageName: string): Promise<any> {
		logger.info(`Checking if image exists: ${imageName}`);
		try {
			logger.debug(`Getting image: ${imageName} if it doesn't exist`);
			await Executor.docker.getImage(imageName).inspect();
			logger.info(`Image already exists: ${imageName}`);
			return; // Image exists, no need to pull
		} catch (error: any) {
			if (error.statusCode !== 404) {
				logger.error(`Error inspecting image ${imageName}: ${error}`);
				throw error;
			}
		}

		return new Promise((resolve, reject) => {
			logger.info(`Pulling image: ${imageName}`);
			Executor.docker.pull(
				imageName,
				(err: Error | null, stream: NodeJS.ReadableStream) => {
					if (err) {
						logger.error(
							`Error initiating pull for image ${imageName}: ${err.message}`
						);
						return reject(err);
					}
					Executor.docker.modem.followProgress(stream, onFinished);

					function onFinished(err: Error | null, output: any[]) {
						if (err) {
							logger.error(
								`Error during image pull progress for ${imageName}: ${err.message}`
							);
							reject(err);
						} else {
							logger.info(
								`Successfully pulled image: ${imageName}`
							);
							resolve(output);
						}
					}
				}
			);
		});
	}

	protected async runCommand(
		container: Docker.Container,
		cmdString: string
	): Promise<string> {
		logger.info(
			`Running command in container: ${Buffer.from(cmdString, "base64").toString("utf-8")}`
		);
		const exec = await container.exec({
			Cmd: ["/bin/bash", "-c", cmdString],
			AttachStdout: true,
			AttachStderr: true,
		});

		const stream = await exec.start({ Detach: false });

		return new Promise((resolve, reject) => {
			let output = "";

			const outStream = new Writable({
				write(chunk, encoding, callback) {
					output += chunk.toString("utf-8");
					callback();
				},
			});

			container.modem.demuxStream(stream, outStream, outStream);

			stream.on("end", () => {
				logger.debug(
					`Command execution finished. Output length: ${output.length}`
				);
				resolve(output);
			});
			stream.on("error", (err) => {
				logger.error(`Error executing command '${cmdString}': ${err}`);
				reject(err);
			});
		});
	}

	protected async copyTestCasesToContainer(
		container: Docker.Container
	): Promise<void> {
		logger.info("Starting to copy test cases to container...");
		const pack = tar.pack();
		const testCasesDir = this.testCasesDir;
		let packedFiles = 0;

		const addFilesRecursively = async (dir: string, baseDir: string) => {
			const items = await fs.readdir(dir);
			for (const item of items) {
				const itemPath = path.join(dir, item);
				const stat = await fs.stat(itemPath);
				if (stat.isDirectory()) {
					await addFilesRecursively(itemPath, baseDir);
				} else if (stat.isFile()) {
					const content = await fs.readFile(itemPath);
					const relativePath = path.relative(baseDir, itemPath);
					const posixPath = relativePath.split(path.sep).join("/");
					pack.entry({ name: `testcases/${posixPath}` }, content);
					packedFiles += 1;
				}
			}
		};

		try {
			await addFilesRecursively(testCasesDir, testCasesDir);
		} catch (err) {
			pack.destroy();
			logger.error(`Failed to read testcases directory ${testCasesDir}: ${err}`);
			throw new TestCasesUnavailableError(
				`Unable to read test cases from ${testCasesDir}`
			);
		}

		if (packedFiles === 0) {
			pack.destroy();
			throw new TestCasesUnavailableError(
				`No test cases found in ${testCasesDir}`
			);
		}

		logger.info(`Successfully packed testcases from ${testCasesDir}`);

		pack.finalize();

		await container.putArchive(pack as any, {
			path: "/workspace",
		});
		logger.info(
			"Successfully copied test cases archive to container /workspace"
		);
	}

	protected generateRunnerScript(
		time_limit: number,
		testcases_dir: string,
		compileCmd: string,
		runCmd: string
	): string {
		logger.info(
			`Generating runner script with time limit: ${time_limit}s for testcases in ${testcases_dir}`
		);
		return `#!/bin/bash
TIME_LIMIT="${time_limit}s"
TESTCASES_DIR="./${testcases_dir}"

# Compile/Syntax Check
if ! ${compileCmd} 2> compile_error.log; then
    ERR_MSG=$(cat compile_error.log | sed 's/"/\\\\"/g' | tr '\\n' ' ')
    echo "{\\"status\\":\\"COMPILE_ERROR\\", \\"compileError\\":\\"$ERR_MSG\\"}"
    exit 0
fi

TLE_CASES=()
WA_CASES=()
RE_CASES=()
PASSED_CASES=0
TOTAL_CASES=0

# Store execution time for each test case
declare -A EXECUTION_TIMES

for tc_dir in "$TESTCASES_DIR"/*; do
    [ -d "$tc_dir" ] || continue
    tc_name=$(basename "$tc_dir")
    
    input_file=$(find "$tc_dir" -maxdepth 1 -name "*.in" | head -n 1)
    ans_file=$(find "$tc_dir" -maxdepth 1 -name "*.ans" | head -n 1)
    
    [ -n "$input_file" ] && [ -n "$ans_file" ] || continue
    
    user_out="$tc_dir/user.out"
    
    TOTAL_CASES=$((TOTAL_CASES + 1))
    
    # Start timer (nanoseconds)
    START_TIME=$(date +%s%N)
    
    timeout "$TIME_LIMIT" ${runCmd} < "$input_file" > "$user_out"
    EXIT_CODE=$?
    
    # End timer
    END_TIME=$(date +%s%N)
    
    # Calculate execution time in milliseconds
    EXECUTION_TIME_NS=$((END_TIME - START_TIME))
    EXECUTION_TIME_MS=$((EXECUTION_TIME_NS / 1000000))
    
    # Store execution time
    EXECUTION_TIMES["$tc_name"]=$EXECUTION_TIME_MS

    if [ $EXIT_CODE -eq 124 ]; then
        TLE_CASES+=("\\"$tc_name\\"")
    elif [ $EXIT_CODE -ne 0 ]; then
        RE_CASES+=("\\"$tc_name\\"")
    else
        if diff -b -B "$ans_file" "$user_out" > /dev/null 2>&1; then
            PASSED_CASES=$((PASSED_CASES + 1))
        else
            WA_CASES+=("\\"$tc_name\\"")
        fi
    fi
done

join_arr() {
    local IFS=,
    echo "\${*}"
}

# Convert execution times associative array to JSON
execution_times_json=""
for tc_name in "\${!EXECUTION_TIMES[@]}"; do
    if [ -n "$execution_times_json" ]; then
        execution_times_json+=","
    fi

    execution_times_json+="\\"$tc_name\\": \${EXECUTION_TIMES[$tc_name]}"
done

cat <<EOF
{
    "status": "SUCCESS",
    "passed": $PASSED_CASES,
    "total": $TOTAL_CASES,
    "executionTimeMs": {
        $execution_times_json
    },
    "failedCases": {
        "tle": [$(join_arr "\${TLE_CASES[@]}")],
        "re": [$(join_arr "\${RE_CASES[@]}")],
        "wa": [$(join_arr "\${WA_CASES[@]}")]
    }
}
EOF
`;
	}

	abstract execute(
		clientCode: string,
		time_limit: number,
		testcases_dir: string
	): Promise<ExecutionResult>;
}
