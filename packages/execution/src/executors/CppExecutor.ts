import { ExecutionResult, Executor } from "../executor/index.js";
import { logger } from "@LCArena/utils";
import Docker from "dockerode";

export class CPPExecutor extends Executor {
	private static IMAGE_NAME = "gcc:latest";

	constructor() {
		super();
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

async function main() {
	const executor = new CPPExecutor();

	const result = await executor.execute(
		`

typedef long long LD;

inline bool eq(LD x, LD y) { return x == y; }
inline bool le(LD x, LD y) { return x <= y; }
inline bool lt(LD x, LD y) { return x < y; }
inline int sign(LD x) { return eq(x, 0) ? 0 : (x < 0 ? -1 : 1); }

struct point {
    LD x, y;
    int id;
    point(LD _x = 0, LD _y = 0, int _id = -1) : x(_x), y(_y), id(_id) {}
    point operator+(point p) { return point(x+p.x, y+p.y, id); }
    point operator-(point p) { return point(x-p.x, y-p.y, id); }
    point operator*(LD s) { return point(x * s, y * s, id); }
    point operator/(LD s) { return point(x / s, y / s, id); }
    LD operator*(point p) { return x * p.x + y * p.y; }
    LD operator%(point p) { return x * p.y - y * p.x; }
    LD norm2() { return *this * *this; }
    bool operator<(point p) const { return eq(y, p.y) ? x < p.x : y < p.y; }
    bool operator==(point p) { return eq(x, p.x) && eq(y, p.y); }
};

// 1 : ccw, -1 : cw, 0 : colinear
int ccw(point a, point b, point c) {
    return sign((b-a) % (c-b));
}

class Solution {
private:
    void sort_circular(vector<point>& vp) {
        vector<point> upper, lower;
        point origin;
        for (point p : vp) {
            if (origin < p) {
                upper.push_back(p);
            } else {
                lower.push_back(p);
            }
        }
        sort(lower.begin(), lower.end(), [&](point& le, point& ri) {
            return (le % ri) > 0;
        });
        sort(upper.begin(), upper.end(), [&](point& le, point& ri) {
            return (le % ri) > 0;
        });
        upper.insert(upper.end(), lower.begin(), lower.end());
        vp.swap(upper);
    }

public:
    int solve(vector<vector<int>>& points) {
        int n = points.size();
        if (n == 0) return 0;
        
        vector<point> vp(n);
        for (int i = 0; i < n; ++i) {
            // Unpacking the 2D array points into our point struct
            vp[i] = point(points[i][0], points[i][1], i);
        }
        
        vector<vector<int>> cnt(n, vector<int>(n, 0));
        for (int i = 0; i < n; ++i) {
            vector<point> others;
            others.reserve(n-1);
            for (int j = 0; j < n; ++j) {
                if (j == i) continue;
                others.push_back(vp[j] - vp[i]);
            }
            sort_circular(others);
            const int sz = n-1;
            for (int j = 0, cur = 0; j < sz; ++j) {
                while (cur < sz-1 && (others[j] % others[(j+cur+1) % sz]) > 0) ++cur;
                cnt[i][others[j].id] = cur;
                cur = max(0, cur-1);
            }
        }
        
        vector<vector<int>> ray_intersects(n, vector<int>(n, 0));
        for (int i = 0; i < n; ++i) {
            vector<point> others;
            others.reserve(2 * (n-1));
            for (int j = 0; j < n; ++j) {
                if (j == i) continue;
                others.push_back(vp[j] - vp[i]);
                others.push_back(vp[i] - vp[j]);
                others.back().id = ~j;
            }
            sort_circular(others);
            const int sz = others.size();
            
            int start = 0;
            while (start < sz && others[start].id < 0) ++start; 
            
            int cur = 0, added = 0;
            for (int j = start+1; j < sz && (others[start] % others[j]) > 0; ++j) {
                if (others[j].id >= 0) {
                    auto id = others[j].id;
                    cur += cnt[i][id];
                    cur -= added;
                    ++added;
                }
            }
            for (int j = start; j < sz; ++j) {
                int id = others[j].id;
                if (id < 0) {
                    id = ~id;
                    cur += cnt[i][id] - cnt[id][i];
                } else {
                    ray_intersects[i][id] = cur;
                }
            }
        }
        
        int best = n * (n-1) / 2;
        for (int i = 0; i < n; ++i) {
            for (int j = i+1; j < n; ++j) {
                best = min(best, ray_intersects[i][j] + ray_intersects[j][i] +
                           cnt[i][j] * (cnt[i][j] - 1) / 2 + cnt[j][i] * (cnt[j][i]-1) / 2);
            }
        }
        
        best = n * (n-1) / 2 - (2 * (n-1)-1) - best;
        return best;
    }
};        
`,
		10,
		"./testcases"
	);
	logger.info(JSON.stringify(result, null, 2));
}

main();
