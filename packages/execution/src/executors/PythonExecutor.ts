import { ExecutionResult, Executor } from "../executor/index.js";
import Docker from "dockerode";
import {logger} from "@LCArena/utils"

export class PythonExecutor extends Executor {
	private static IMAGE_NAME = "python:3.11-slim";

	constructor() {
		super();
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

async function main() {
	const executor = new PythonExecutor();

	const result = await executor.execute(
		`
import functools

class Point:
    __slots__ = ['x', 'y', 'id']
    
    def __init__(self, x, y, id):
        self.x = x
        self.y = y
        self.id = id
        
    def sub(self, p):
        return Point(self.x - p.x, self.y - p.y, self.id)
        
    def cross(self, p):
        return self.x * p.y - self.y * p.x
        
    def less_than(self, p):
        if self.y == p.y:
            return self.x < p.x
        return self.y < p.y

def compare_points(le, ri):
    cross_product = le.cross(ri)
    if cross_product > 0:
        return -1
    if cross_product < 0:
        return 1
    return 0

class Solution:
    def sort_circular(self, vp):
        upper = []
        lower = []
        origin = Point(0, 0, -1)
        
        for p in vp:
            if origin.less_than(p):
                upper.append(p)
            else:
                lower.append(p)
                
        # Sort based on cross product
        upper.sort(key=functools.cmp_to_key(compare_points))
        lower.sort(key=functools.cmp_to_key(compare_points))
        
        vp.clear()
        vp.extend(upper)
        vp.extend(lower)

    def solve(self, pointsArr):
        n = len(pointsArr)
        if n == 0:
            return 0
            
        vp = [Point(pointsArr[i][0], pointsArr[i][1], i) for i in range(n)]
        
        cnt = [[0] * n for _ in range(n)]
        for i in range(n):
            others = []
            for j in range(n):
                if j == i: continue
                others.append(vp[j].sub(vp[i]))
                
            self.sort_circular(others)
            sz = n - 1
            cur = 0
            for j in range(sz):
                while cur < sz - 1 and others[j].cross(others[(j + cur + 1) % sz]) > 0:
                    cur += 1
                cnt[i][others[j].id] = cur
                cur = max(0, cur - 1)
                
        ray_intersects = [[0] * n for _ in range(n)]
        for i in range(n):
            others = []
            for j in range(n):
                if j == i: continue
                others.append(vp[j].sub(vp[i]))
                p2 = vp[i].sub(vp[j])
                p2.id = ~j
                others.append(p2)
                
            self.sort_circular(others)
            sz = len(others)
            
            start = 0
            while start < sz and others[start].id < 0:
                start += 1
                
            cur = 0
            added = 0
            j = start + 1
            while j < sz and others[start].cross(others[j]) > 0:
                if others[j].id >= 0:
                    id_ = others[j].id
                    cur += cnt[i][id_]
                    cur -= added
                    added += 1
                j += 1
                
            for k in range(start, sz):
                id_ = others[k].id
                if id_ < 0:
                    id_ = ~id_
                    cur += cnt[i][id_] - cnt[id_][i]
                else:
                    ray_intersects[i][id_] = cur
                    
        best = n * (n - 1) // 2
        for i in range(n):
            for j in range(i + 1, n):
                val = (ray_intersects[i][j] + ray_intersects[j][i] +
                       cnt[i][j] * (cnt[i][j] - 1) // 2 + 
                       cnt[j][i] * (cnt[j][i] - 1) // 2)
                if val < best:
                    best = val
                    
        best = n * (n - 1) // 2 - (2 * (n - 1) - 1) - best
        return best
`,
		5,
		"./testcases"
	);
	logger.info(JSON.stringify(result, null, 2));
}

main();
