import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import {
    ensureBucketExists,
    putObject,
    deleteObjectsWithPrefix,
    getProblemTestCasePrefix,
    getTestCaseInputKey,
    getTestCaseOutputKey,
    getBucketName,
} from "@LCArena/config";

let MONGO_URL = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017/lcarena";
if (MONGO_URL.includes("mongo:27017")) {
    MONGO_URL = MONGO_URL.replace("mongo:27017", "127.0.0.1:27017");
}
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
if (process.env.S3_ENDPOINT.includes("minio:9000")) {
    process.env.S3_ENDPOINT = process.env.S3_ENDPOINT.replace("minio:9000", "127.0.0.1:9000");
}

// Reference Solvers for generating accurate test outputs
const solvers = {
    barriers: (points) => {
        function ccw(p1, p2, p3) {
            return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
        }
        function intersect(p1, p2, p3, p4) {
            return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
        }
        const n = points.length;
        const segments = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                segments.push([points[i], points[j], i, j]);
            }
        }
        let maxStrength = 0;
        for (let i = 0; i < segments.length; i++) {
            let strength = 0;
            const [p1, p2, i1, i2] = segments[i];
            for (let j = 0; j < segments.length; j++) {
                if (i === j) continue;
                const [p3, p4, j1, j2] = segments[j];
                if (i1 === j1 || i1 === j2 || i2 === j1 || i2 === j2) continue;
                if (intersect(p1, p2, p3, p4)) strength++;
            }
            if (strength > maxStrength) maxStrength = strength;
        }
        return maxStrength;
    },

    maxPointsOnLine: (points) => {
        const n = points.length;
        if (n <= 2) return n;
        function gcd(a, b) {
            return b === 0 ? a : gcd(b, a % b);
        }
        let maxPts = 2;
        for (let i = 0; i < n; i++) {
            const map = new Map();
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
                const key = `${dx}/${dy}`;
                const count = (map.get(key) || 1) + 1;
                map.set(key, count);
                if (count > maxPts) maxPts = count;
            }
        }
        return maxPts;
    },

    minManhattan: (points) => {
        const n = points.length;
        if (n < 2) return 0;
        let minD = Infinity;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1]);
                if (d < minD) minD = d;
            }
        }
        return minD;
    },

    maxOverlappingIntervals: (points) => {
        const events = [];
        for (const [start, end] of points) {
            events.push({ t: start, type: -1 }); // start before end when same time
            events.push({ t: end, type: 1 });
        }
        events.sort((a, b) => a.t !== b.t ? a.t - b.t : a.type - b.type);
        let cur = 0;
        let maxOverlap = 0;
        for (const ev of events) {
            if (ev.type === -1) {
                cur++;
                if (cur > maxOverlap) maxOverlap = cur;
            } else {
                cur--;
            }
        }
        return maxOverlap;
    },

    connectedClusters: (points) => {
        const n = points.length;
        if (n === 0) return 0;
        const parent = Array.from({ length: n }, (_, i) => i);
        function find(i) {
            if (parent[i] === i) return i;
            return (parent[i] = find(parent[i]));
        }
        function union(i, j) {
            const ri = find(i);
            const rj = find(j);
            if (ri !== rj) {
                parent[ri] = rj;
                return true;
            }
            return false;
        }
        let clusters = n;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = Math.abs(points[i][0] - points[j][0]);
                const dy = Math.abs(points[i][1] - points[j][1]);
                if (Math.max(dx, dy) <= 1) {
                    if (union(i, j)) clusters--;
                }
            }
        }
        return clusters;
    },

    convexHullPerimeter: (points) => {
        const n = points.length;
        if (n <= 1) return 0;
        if (n === 2) {
            const d = Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]);
            return Math.floor(2 * d);
        }
        const pts = Array.from(new Set(points.map((p) => `${p[0]},${p[1]}`)))
            .map((s) => s.split(",").map(Number))
            .sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);

        if (pts.length <= 1) return 0;
        if (pts.length === 2) {
            const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
            return Math.floor(2 * d);
        }

        function cross(o, a, b) {
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        }

        const lower = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
                lower.pop();
            }
            lower.push(p);
        }

        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            const p = pts[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
                upper.pop();
            }
            upper.push(p);
        }

        const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
        if (hull.length < 2) {
            const d = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
            return Math.floor(2 * d);
        }

        let perim = 0;
        for (let i = 0; i < hull.length; i++) {
            const p1 = hull[i];
            const p2 = hull[(i + 1) % hull.length];
            perim += Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        }
        return Math.floor(perim);
    },
};

function formatInput(points) {
    const lines = [`${points.length}`];
    for (const p of points) {
        lines.push(`${p[0]} ${p[1]}`);
    }
    return lines.join("\n") + "\n";
}

const PROBLEM_DEFINITIONS = [
    {
        title: "Max Points on a Line",
        difficulty: "Easy",
        tags: ["Geometry", "Math", "Hash Table"],
        time_limit: 2000,
        statement: `Given an array of $N$ points where \`points[i] = [xi, yi]\` represents a point on the X-Y plane, return the maximum number of points that lie on the same straight line.

If $N \\le 2$, all points lie on the same line, so return $N$.`,
        examples: [
            {
                input: "points = [[1,1],[2,2],[3,3]]",
                output: "3",
                explanation: "All three points lie on the line y = x.",
            },
            {
                input: "points = [[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]",
                output: "4",
                explanation: "The four points [1,4], [2,3], [3,2], and [4,1] lie on the line x + y = 5.",
            },
        ],
        constraints: [
            "1 <= points.length <= 300",
            "points[i].length == 2",
            "-10^4 <= points[i][0], points[i][1] <= 10^4",
            "All the points are unique.",
        ],
        rawCases: [
            [[0, 0]],
            [[1, 1], [2, 2]],
            [[1, 1], [2, 2], [3, 3]],
            [[1, 5], [2, 5], [3, 5], [4, 6]],
            [[3, 1], [3, 2], [3, 7], [4, 7]],
            [[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]],
            [[0, 4], [1, 3], [2, 2], [3, 1], [0, 0]],
            [[0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [3, 3]],
        ],
        solverKey: "maxPointsOnLine",
    },

    {
        title: "Minimum Manhattan Distance",
        difficulty: "Easy",
        tags: ["Array", "Math", "Two Pointers"],
        time_limit: 2000,
        statement: `Given an array of $N$ points where \`points[i] = [xi, yi]\`, return the minimum Manhattan distance between any two distinct points.

The Manhattan distance between two points $(x_1, y_1)$ and $(x_2, y_2)$ is $|x_1 - x_2| + |y_1 - y_2|$.`,
        examples: [
            {
                input: "points = [[0,0],[3,4],[1,1]]",
                output: "2",
                explanation: "The distance between [0,0] and [1,1] is |0-1| + |0-1| = 2.",
            },
            {
                input: "points = [[5,5],[10,10],[5,6]]",
                output: "1",
                explanation: "The distance between [5,5] and [5,6] is |5-5| + |5-6| = 1.",
            },
        ],
        constraints: [
            "2 <= points.length <= 10^4",
            "points[i].length == 2",
            "-10^4 <= points[i][0], points[i][1] <= 10^4",
        ],
        rawCases: [
            [[0, 0], [1, 2]],
            [[0, 0], [3, 4], [1, 1]],
            [[5, 5], [10, 10], [5, 6]],
            [[-5, -5], [5, 5], [-4, -4]],
            [[0, 0], [0, 4], [4, 0], [4, 4]],
            [[1, 1], [3, 3], [6, 6], [10, 10], [15, 15]],
            [[10, 20], [30, 40], [50, 60], [12, 20], [80, 90], [100, 100]],
            [[-10, 20], [-9, 21], [0, 0], [10, 10], [20, 20], [30, 30], [40, 40]],
        ],
        solverKey: "minManhattan",
    },

    {
        title: "Maximum Overlapping Intervals",
        difficulty: "Medium",
        tags: ["Array", "Sorting", "Greedy", "Intervals"],
        time_limit: 2000,
        statement: `You are given $N$ intervals where \`points[i] = [start_i, end_i]\` represents the start and end of an activity.

Find the maximum number of intervals that overlap at any single moment. If an interval ends at time $t$ and another interval starts at time $t$, they are considered overlapping at time $t$.`,
        examples: [
            {
                input: "points = [[1,5],[2,6],[3,7],[8,10]]",
                output: "3",
                explanation: "At time 3, intervals [1,5], [2,6], and [3,7] all overlap.",
            },
            {
                input: "points = [[1,2],[3,4],[5,6]]",
                output: "1",
                explanation: "No two intervals overlap.",
            },
        ],
        constraints: [
            "1 <= points.length <= 10^4",
            "0 <= start_i <= end_i <= 10^9",
        ],
        rawCases: [
            [[1, 10]],
            [[1, 2], [3, 4], [5, 6]],
            [[1, 10], [2, 9], [3, 8]],
            [[1, 5], [2, 6], [3, 7], [8, 10]],
            [[1, 4], [4, 8], [8, 12]],
            [[0, 5], [1, 5], [2, 5], [3, 5], [5, 10]],
            [[1, 4], [2, 5], [6, 9], [7, 10], [8, 11], [1, 10]],
            [[1, 8], [2, 6], [3, 5], [6, 9], [7, 12], [8, 10], [11, 15]],
        ],
        solverKey: "maxOverlappingIntervals",
    },

    {
        title: "Connected Coordinate Clusters",
        difficulty: "Medium",
        tags: ["Graph", "BFS", "Union Find", "Grid"],
        time_limit: 2000,
        statement: `You are given $N$ distinct points on a 2D integer grid where \`points[i] = [xi, yi]\`.

Two points are connected if their Chebyshev distance is at most 1 (i.e. they are adjacent horizontally, vertically, or diagonally: $\\max(|x_1 - x_2|, |y_1 - y_2|) \\le 1$).

Points can be indirectly connected through chains of adjacent points, forming connected clusters. Return the total number of connected clusters.`,
        examples: [
            {
                input: "points = [[0,0],[0,1],[5,5]]",
                output: "2",
                explanation: "Points [0,0] and [0,1] form cluster 1; [5,5] forms cluster 2.",
            },
            {
                input: "points = [[0,0],[1,1],[2,2],[3,3]]",
                output: "1",
                explanation: "All points are connected diagonally in a single cluster.",
            },
        ],
        constraints: [
            "1 <= points.length <= 1000",
            "-10^4 <= points[i][0], points[i][1] <= 10^4",
            "All points are distinct.",
        ],
        rawCases: [
            [[0, 0]],
            [[0, 0], [0, 1]],
            [[0, 0], [5, 5]],
            [[0, 0], [1, 1], [2, 2], [3, 3]],
            [[0, 0], [0, 1], [10, 10], [10, 11], [20, 20]],
            [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0]],
            [[1, 1], [1, 2], [1, 3], [5, 1], [5, 2], [5, 3], [9, 1]],
            [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [10, 10]],
        ],
        solverKey: "connectedClusters",
    },

    {
        title: "ICPC Magical Barriers",
        difficulty: "Medium",
        tags: ["Geometry", "Math", "Line Sweep"],
        time_limit: 3000,
        statement: `There are $N$ power sources located at 2D coordinates $(X_i, Y_i)$ such that no three sources lie on a straight line. For every pair of distinct sources $i < j$, a line segment (magical barrier) forms between them.

Two distinct barriers intersect if and only if they cross at a single interior point. The strength of a barrier $b$ is the number of other barriers that intersect $b$.

Find the strength of the strongest magical barrier in the kingdom.`,
        examples: [
            {
                input: "points = [[0,0],[1,1]]",
                output: "0",
                explanation: "Only 1 barrier exists, so it cannot intersect any other.",
            },
            {
                input: "points = [[0,0],[0,2],[2,2],[2,0]]",
                output: "1",
                explanation: "The two diagonal barriers (0,0)-(2,2) and (0,2)-(2,0) intersect each other.",
            },
        ],
        constraints: [
            "2 <= N <= 20",
            "-1000 <= X_i, Y_i <= 1000",
            "No three power sources are collinear.",
        ],
        rawCases: [
            [[0, 0], [1, 1]],
            [[0, 0], [0, 2], [2, 2], [2, 0]],
            [[0, 0], [1, 3], [3, 1], [4, 4], [2, 2]],
            [[0, 0], [0, 4], [4, 4], [4, 0], [2, 5]],
            [[0, 0], [1, 5], [2, 1], [3, 4], [4, 2], [5, 6]],
            [[-5, -5], [-5, 5], [5, 5], [5, -5], [0, 6], [0, -6]],
            [[1, 2], [3, 8], [7, 5], [9, 1], [4, 3], [6, 9], [2, 6]],
            [[-3, 2], [1, 7], [4, 4], [6, 1], [3, -2], [-1, -3], [-4, -1], [0, 0]],
        ],
        solverKey: "barriers",
    },

    {
        title: "Convex Hull Perimeter",
        difficulty: "Hard",
        tags: ["Computational Geometry", "Convex Hull", "Math"],
        time_limit: 2000,
        statement: `Given $N$ points in a 2D plane where \`points[i] = [xi, yi]\`, compute the perimeter of the convex hull containing all points.

Return the perimeter rounded down to the nearest integer (floor).
- If $N \\le 1$, return 0.
- If $N = 2$, return twice the Euclidean distance between the two points, rounded down.`,
        examples: [
            {
                input: "points = [[0,0],[0,3],[4,0]]",
                output: "12",
                explanation: "Right triangle with sides 3, 4, and 5. Perimeter = 3 + 4 + 5 = 12.",
            },
            {
                input: "points = [[0,0],[0,2],[2,2],[2,0],[1,1]]",
                output: "8",
                explanation: "Square of side length 2 with [1,1] in the interior. Perimeter = 4 * 2 = 8.",
            },
        ],
        constraints: [
            "1 <= points.length <= 1000",
            "-10^4 <= points[i][0], points[i][1] <= 10^4",
        ],
        rawCases: [
            [[5, 5]],
            [[0, 0], [0, 3]],
            [[0, 0], [0, 3], [4, 0]],
            [[0, 0], [0, 1], [1, 1], [1, 0]],
            [[0, 0], [0, 2], [2, 2], [2, 0], [1, 1]],
            [[0, 0], [1, 1], [2, 2], [3, 3]],
            [[0, 0], [4, 0], [5, 3], [2, 5], [-1, 3], [2, 2], [1, 1]],
            [[2, 0], [1, 2], [-1, 2], [-2, 0], [-1, -2], [1, -2]],
        ],
        solverKey: "convexHullPerimeter",
    },
];

function formatMarkdownDescription(p) {
    const examplesMarkdown = p.examples
        .map(
            (ex, i) => `### Example ${i + 1}
**Input:** \`${ex.input}\`  
**Output:** \`${ex.output}\`  
${ex.explanation ? `**Explanation:** ${ex.explanation}` : ""}`
        )
        .join("\n\n");

    const constraintsMarkdown = p.constraints.map((c) => `- ${c}`).join("\n");

    return `# ${p.title}

**Difficulty:** ${p.difficulty} | **Topics:** ${p.tags.join(", ")}

## Description
${p.statement}

## Examples
${examplesMarkdown}

## Constraints
${constraintsMarkdown}
`;
}

async function main() {
    console.log("[seed] Connecting to MongoDB at", MONGO_URL);
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db();
    const problemsCol = db.collection("problems");
    const submissionsCol = db.collection("submissions");

    console.log("[seed] Discarding all existing problems and submissions in MongoDB...");
    const delProblems = await problemsCol.deleteMany({});
    const delSubmissions = await submissionsCol.deleteMany({});
    console.log(`[seed] Deleted ${delProblems.deletedCount} problems and ${delSubmissions.deletedCount} submissions.`);

    console.log("[seed] Initializing MinIO object storage...");
    await ensureBucketExists();
    const bucket = getBucketName();
    console.log(`[seed] Target S3 bucket: ${bucket}`);

    console.log("[seed] Purging existing test cases in MinIO...");
    await deleteObjectsWithPrefix("Evaluation_Test_Cases/").catch((err) =>
        console.warn("[seed] Could not purge existing test cases:", err.message)
    );

    console.log("[seed] Seeding 6 new problems with 8 real test cases each...");
    const createdProblems = [];

    for (const def of PROBLEM_DEFINITIONS) {
        const problemId = new ObjectId();
        const idString = String(problemId);
        const prefix = getProblemTestCasePrefix(idString);
        const solver = solvers[def.solverKey];

        console.log(`\n--> Creating Problem: ${def.title} (${def.difficulty}) [ID: ${idString}]`);

        // Upload 8 test cases
        for (let i = 0; i < def.rawCases.length; i++) {
            const index = i + 1;
            const points = def.rawCases[i];
            const inputContent = formatInput(points);
            const expectedOutput = String(solver(points)) + "\n";

            const inputKey = getTestCaseInputKey(idString, index);
            const outputKey = getTestCaseOutputKey(idString, index);

            await putObject(inputKey, inputContent, "text/plain; charset=utf-8");
            await putObject(outputKey, expectedOutput, "text/plain; charset=utf-8");
        }

        console.log(`    Uploaded ${def.rawCases.length} test cases to MinIO: ${prefix}`);

        const doc = {
            _id: problemId,
            description: formatMarkdownDescription(def),
            difficulty: def.difficulty,
            time_limit: def.time_limit,
            sampleTestCaseUrl: `s3://${bucket}/${prefix}test_case_001/input.in`,
            testCasesUrl: `s3://${bucket}/${prefix}`,
            testCaseStoragePrefix: prefix,
            testCasesCount: def.rawCases.length,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await problemsCol.insertOne(doc);
        createdProblems.push({ id: idString, title: def.title, difficulty: def.difficulty });
    }

    console.log("\n========================================================");
    console.log("SEEDED PROBLEMS IN MONGODB & MINIO SUCCESSFULLY!");
    console.log("========================================================");
    for (const p of createdProblems) {
        console.log(`  - [${p.difficulty}] ${p.title} -> http://localhost:5173/problems/${p.id}`);
    }
    console.log("========================================================\n");

    await client.close();
}

main().catch((err) => {
    console.error("[seed] Fatal error:", err);
    process.exit(1);
});
