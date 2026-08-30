import { ExecutionResult, Executor } from "../executor/index.js";
import { logger } from "@LCArena/utils";
import Docker from "dockerode";

export class JSExecutor extends Executor {
	private static IMAGE_NAME = "node:20-slim";

	constructor() {
		super();
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
	const executor = new JSExecutor();

	const result = await executor.execute(
		`
class Point {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
    }
    
    sub(p) {
        return new Point(this.x - p.x, this.y - p.y, this.id);
    }
    
    // Use BigInt to prevent precision loss for large coordinate cross products
    cross(p) {
        return BigInt(this.x) * BigInt(p.y) - BigInt(this.y) * BigInt(p.x);
    }
    
    lessThan(p) {
        if (this.y === p.y) return this.x < p.x;
        return this.y < p.y;
    }
}

class Solution {
    sortCircular(vp) {
        const upper = [];
        const lower = [];
        const origin = new Point(0, 0, -1);
        
        for (let i = 0; i < vp.length; i++) {
            if (origin.lessThan(vp[i])) {
                upper.push(vp[i]);
            } else {
                lower.push(vp[i]);
            }
        }
        
        const cmp = (le, ri) => {
            const crossProduct = le.cross(ri);
            if (crossProduct > 0n) return -1;
            if (crossProduct < 0n) return 1;
            return 0;
        };
        
        lower.sort(cmp);
        upper.sort(cmp);
        
        vp.length = 0;
        vp.push(...upper, ...lower);
    }

    solve(pointsArr) {
        const n = pointsArr.length;
        if (n === 0) return 0;
        
        const vp = Array(n);
        for (let i = 0; i < n; i++) {
            vp[i] = new Point(pointsArr[i][0], pointsArr[i][1], i);
        }
        
        const cnt = Array.from({ length: n }, () => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            const others = [];
            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                others.push(vp[j].sub(vp[i]));
            }
            
            this.sortCircular(others);
            const sz = n - 1;
            let cur = 0;
            
            for (let j = 0; j < sz; j++) {
                while (cur < sz - 1 && others[j].cross(others[(j + cur + 1) % sz]) > 0n) {
                    cur++;
                }
                cnt[i][others[j].id] = cur;
                cur = Math.max(0, cur - 1);
            }
        }
        
        const ray_intersects = Array.from({ length: n }, () => Array(n).fill(0));
        
        for (let i = 0; i < n; i++) {
            const others = [];
            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                others.push(vp[j].sub(vp[i]));
                const p2 = vp[i].sub(vp[j]);
                p2.id = ~j;
                others.push(p2);
            }
            
            this.sortCircular(others);
            const sz = others.length;
            
            let start = 0;
            while (start < sz && others[start].id < 0) start++;
            
            let cur = 0, added = 0;
            for (let j = start + 1; j < sz && others[start].cross(others[j]) > 0n; j++) {
                if (others[j].id >= 0) {
                    const id = others[j].id;
                    cur += cnt[i][id];
                    cur -= added;
                    added++;
                }
            }
            
            for (let j = start; j < sz; j++) {
                let id = others[j].id;
                if (id < 0) {
                    id = ~id;
                    cur += cnt[i][id] - cnt[id][i];
                } else {
                    ray_intersects[i][id] = cur;
                }
            }
        }
        
        let best = (n * (n - 1)) / 2;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const val = ray_intersects[i][j] + ray_intersects[j][i] +
                           (cnt[i][j] * (cnt[i][j] - 1)) / 2 + 
                           (cnt[j][i] * (cnt[j][i] - 1)) / 2;
                if (val < best) best = val;
            }
        }
        
        best = (n * (n - 1)) / 2 - (2 * (n - 1) - 1) - best;
        return best;
    }
}

module.exports = { Solution };
`,
		2,
		"./testcases"
	);
	logger.info(JSON.stringify(result, null, 2));
}

main();
