/**
 * Deterministic test programs across supported languages and execution outcomes.
 * Target problem: Max Points on a Line (Problem ID: 6acbe44e0037ad06dc5f0c20)
 */

export const programs = {
    python: {
        accepted: `import math
from collections import defaultdict

class Solution:
    def solve(self, points: list[list[int]]) -> int:
        n = len(points)
        if n <= 2:
            return n
        max_pts = 2
        for i in range(n):
            slopes = defaultdict(int)
            for j in range(i + 1, n):
                dx = points[j][0] - points[i][0]
                dy = points[j][1] - points[i][1]
                g = math.gcd(dx, dy)
                dx //= g
                dy //= g
                if dx < 0 or (dx == 0 and dy < 0):
                    dx = -dx
                    dy = -dy
                slopes[(dx, dy)] += 1
            for count in slopes.values():
                if count + 1 > max_pts:
                    max_pts = count + 1
        return max_pts
`,
        wrongAnswer: `class Solution:
    def solve(self, points: list[list[int]]) -> int:
        return -9999
`,
        compileError: `class Solution
    def solve(self, points)
        invalid python syntax here!
`,
        timeLimitExceeded: `import time
class Solution:
    def solve(self, points: list[list[int]]) -> int:
        time.sleep(10)
        return len(points)
`,
    },

    cpp: {
        accepted: `#include <vector>
#include <map>
#include <numeric>
#include <algorithm>
using namespace std;

class Solution {
public:
    int solve(vector<vector<int>>& points) {
        int n = points.size();
        if (n <= 2) return n;
        int maxPts = 2;
        for (int i = 0; i < n; i++) {
            map<pair<int, int>, int> slopes;
            for (int j = i + 1; j < n; j++) {
                int dx = points[j][0] - points[i][0];
                int dy = points[j][1] - points[i][1];
                int g = std::gcd(dx, dy);
                dx /= g;
                dy /= g;
                if (dx < 0 || (dx == 0 && dy < 0)) {
                    dx = -dx;
                    dy = -dy;
                }
                slopes[{dx, dy}]++;
            }
            for (auto const& [k, v] : slopes) {
                if (v + 1 > maxPts) maxPts = v + 1;
            }
        }
        return maxPts;
    }
};
`,
        wrongAnswer: `#include <vector>
using namespace std;

class Solution {
public:
    int solve(vector<vector<int>>& points) {
        return -9999;
    }
};
`,
        compileError: `class Solution {
    int invalid cpp syntax
`,
        timeLimitExceeded: `#include <vector>
#include <thread>
#include <chrono>
using namespace std;

class Solution {
public:
    int solve(vector<vector<int>>& points) {
        std::this_thread::sleep_for(std::chrono::seconds(10));
        return 0;
    }
};
`,
    },

    javascript: {
        accepted: `class Solution {
    solve(points) {
        const n = points.length;
        if (n <= 2) return n;
        const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
        let maxPts = 2;
        for (let i = 0; i < n; i++) {
            const slopes = new Map();
            for (let j = i + 1; j < n; j++) {
                let dx = points[j][0] - points[i][0];
                let dy = points[j][1] - points[i][1];
                const g = Math.abs(gcd(dx, dy));
                dx /= g;
                dy /= g;
                if (dx < 0 || (dx === 0 && dy < 0)) {
                    dx = -dx;
                    dy = -dy;
                }
                const key = \`\${dx}/\${dy}\`;
                const count = (slopes.get(key) || 0) + 1;
                slopes.set(key, count);
                if (count + 1 > maxPts) maxPts = count + 1;
            }
        }
        return maxPts;
    }
}
module.exports = Solution;
`,
        wrongAnswer: `class Solution {
    solve(points) {
        return -9999;
    }
}
module.exports = Solution;
`,
        compileError: `const invalid syntax = ;;;;`,
        timeLimitExceeded: `class Solution {
    solve(points) {
        const start = Date.now();
        while (Date.now() - start < 10000) {}
        return 0;
    }
}
module.exports = Solution;
`,
    },
};
