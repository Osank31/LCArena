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

async function main() {
	const executor = new JavaExecutor();

	const result = await executor.execute(
		`
import java.util.*;

class Point {
    long x, y;
    int id;
    
    Point(long x, long y, int id) {
        this.x = x;
        this.y = y;
        this.id = id;
    }
    
    Point sub(Point p) { return new Point(x - p.x, y - p.y, id); }
    long cross(Point p) { return x * p.y - y * p.x; }
    
    boolean lessThan(Point p) {
        return y == p.y ? x < p.x : y < p.y;
    }
}

public class Solution {

    private void sortCircular(List<Point> vp) {
        List<Point> upper = new ArrayList<>();
        List<Point> lower = new ArrayList<>();
        Point origin = new Point(0, 0, -1);
        
        for (Point p : vp) {
            if (origin.lessThan(p)) {
                upper.add(p);
            } else {
                lower.add(p);
            }
        }
        
        Comparator<Point> cmp = (le, ri) -> {
            long crossProduct = le.cross(ri);
            if (crossProduct > 0) return -1;
            if (crossProduct < 0) return 1;
            return 0;
        };
        
        lower.sort(cmp);
        upper.sort(cmp);
        
        vp.clear();
        vp.addAll(upper);
        vp.addAll(lower);
    }

    public int solve(int[][] pointsArr) {
        int n = pointsArr.length;
        if (n == 0) return 0;
        
        Point[] vp = new Point[n];
        for (int i = 0; i < n; ++i) {
            vp[i] = new Point(pointsArr[i][0], pointsArr[i][1], i);
        }
        
        int[][] cnt = new int[n][n];
        for (int i = 0; i < n; ++i) {
            List<Point> others = new ArrayList<>(n - 1);
            for (int j = 0; j < n; ++j) {
                if (j == i) continue;
                others.add(vp[j].sub(vp[i]));
            }
            sortCircular(others);
            int sz = n - 1;
            for (int j = 0, cur = 0; j < sz; ++j) {
                while (cur < sz - 1 && others.get(j).cross(others.get((j + cur + 1) % sz)) > 0) {
                    ++cur;
                }
                cnt[i][others.get(j).id] = cur;
                cur = Math.max(0, cur - 1);
            }
        }
        
        int[][] ray_intersects = new int[n][n];
        for (int i = 0; i < n; ++i) {
            List<Point> others = new ArrayList<>(2 * (n - 1));
            for (int j = 0; j < n; ++j) {
                if (j == i) continue;
                others.add(vp[j].sub(vp[i]));
                Point p2 = vp[i].sub(vp[j]);
                p2.id = ~j;
                others.add(p2);
            }
            sortCircular(others);
            int sz = others.size();
            
            int start = 0;
            while (start < sz && others.get(start).id < 0) ++start; 
            
            int cur = 0, added = 0;
            for (int j = start + 1; j < sz && others.get(start).cross(others.get(j)) > 0; ++j) {
                if (others.get(j).id >= 0) {
                    int id = others.get(j).id;
                    cur += cnt[i][id];
                    cur -= added;
                    ++added;
                }
            }
            for (int j = start; j < sz; ++j) {
                int id = others.get(j).id;
                if (id < 0) {
                    id = ~id;
                    cur += cnt[i][id] - cnt[id][i];
                } else {
                    ray_intersects[i][id] = cur;
                }
            }
        }
        
        int best = n * (n - 1) / 2;
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j < n; ++j) {
                best = Math.min(best, ray_intersects[i][j] + ray_intersects[j][i] +
                           cnt[i][j] * (cnt[i][j] - 1) / 2 + cnt[j][i] * (cnt[j][i] - 1) / 2);
            }
        }
        
        best = n * (n - 1) / 2 - (2 * (n - 1) - 1) - best;
        return best;
    }
}
`,
		2,
		"./testcases"
	);
	logger.info(JSON.stringify(result, null, 2));
}

main();
