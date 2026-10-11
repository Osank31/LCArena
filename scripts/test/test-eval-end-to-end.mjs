const pythonCode = `import math
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
`;

async function test() {
    console.log("Submitting solution to Problem: Max Points on a Line...");
    const res = await fetch("http://127.0.0.1:3002/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": "6acb3db878de73ea0b742ffb",
        },
        body: JSON.stringify({
            problemId: "6acbe44e0037ad06dc5f0c20",
            language: "py",
            code: pythonCode,
        }),
    });
    const data = await res.json();
    console.log("Submission response:", data);
    const subId = data.data?._id;
    if (!subId) return;

    console.log(`Tracking evaluation for submission ID: ${subId}...`);
    for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        const subRes = await fetch("http://127.0.0.1:3002/" + subId, {
            headers: { "x-user-id": "6acb3db878de73ea0b742ffb" },
        });
        const subData = await subRes.json();
        const status = subData.data?.status;
        console.log(`[Poll ${attempt + 1}] Current status:`, status?.status);
        if (status?.status && status.status !== "PENDING") {
            console.log("\n================ EVALUATION COMPLETED (ACCEPTED) ================");
            console.log("Final Result:", JSON.stringify(status, null, 2));
            console.log("==================================================================\n");
            break;
        }
    }

    console.log("Submitting intentionally incorrect solution (expecting WA)...");
    const badCode = `class Solution:\n    def solve(self, points: list[list[int]]) -> int:\n        return -9999\n`;
    const badRes = await fetch("http://127.0.0.1:3002/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": "6acb3db878de73ea0b742ffb",
        },
        body: JSON.stringify({
            problemId: "6acbe44e0037ad06dc5f0c20",
            language: "py",
            code: badCode,
        }),
    });
    const badData = await badRes.json();
    const badSubId = badData.data?._id;

    for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise((r) => setTimeout(r, 1000));
        const subRes = await fetch("http://127.0.0.1:3002/" + badSubId, {
            headers: { "x-user-id": "6acb3db878de73ea0b742ffb" },
        });
        const subData = await subRes.json();
        const status = subData.data?.status;
        console.log(`[WA Poll ${attempt + 1}] Current status:`, status?.status);
        if (status?.status && status.status !== "PENDING") {
            console.log("\n================ EVALUATION COMPLETED (WRONG ANSWER) ================");
            console.log("Final Result:", JSON.stringify(status, null, 2));
            console.log("=====================================================================\n");
            return;
        }
    }
}

test().catch(console.error);
