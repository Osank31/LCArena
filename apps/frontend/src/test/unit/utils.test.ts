import { describe, expect, it } from "vitest";
import { parseProblem } from "../../utils/problemParser";
import { parseVerdict } from "../../utils/verdictHelper";
import { DEFAULT_STARTER_CODE, LANGUAGE_OPTIONS } from "../../utils/starterCode";
import { IProblem } from "../../types/problem.types";
import { ExecutionResult } from "../../types/submission.types";

describe("starterCode utilities", () => {
  it("provides templates for all supported languages", () => {
    expect(DEFAULT_STARTER_CODE.cpp).toContain("class Solution");
    expect(DEFAULT_STARTER_CODE.py).toContain("class Solution:");
    expect(DEFAULT_STARTER_CODE.java).toContain("public class Solution");
    expect(DEFAULT_STARTER_CODE.js).toContain("class Solution");
  });

  it("exports valid language options", () => {
    expect(LANGUAGE_OPTIONS).toHaveLength(4);
    expect(LANGUAGE_OPTIONS.map((l) => l.value)).toEqual(["cpp", "py", "java", "js"]);
  });
});

describe("problemParser utility", () => {
  const sampleRawProblem: IProblem = {
    _id: "67890abcdef",
    description: `# Two Sum

**Difficulty:** Easy | **Topics:** Array, Hash Table

## Description
Given an array of integers nums and an integer target, return indices of the two numbers.

## Examples
### Example 1
**Input:** \`nums = [2,7,11,15], target = 9\`  
**Output:** \`[0,1]\`  
**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].

## Constraints
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
`,
    difficulty: "Easy",
    sampleTestCaseUrl: "https://seed.lcarena.local/two-sum/sample.txt",
    testCasesUrl: "https://seed.lcarena.local/two-sum/testcases.zip",
    time_limit: 2000,
  };

  it("extracts title, slug, and tags from markdown description", () => {
    const parsed = parseProblem(sampleRawProblem);
    expect(parsed.id).toBe("67890abcdef");
    expect(parsed.title).toBe("Two Sum");
    expect(parsed.slug).toBe("two-sum");
    expect(parsed.difficulty).toBe("Easy");
    expect(parsed.tags).toEqual(["Array", "Hash Table"]);
    expect(parsed.timeLimit).toBe(2000);
    expect(parsed.statement).toContain("Given an array of integers nums");
    expect(parsed.examples).toHaveLength(1);
    expect(parsed.examples[0].input).toBe("nums = [2,7,11,15], target = 9");
    expect(parsed.examples[0].output).toBe("[0,1]");
    expect(parsed.examples[0].explanation).toBe("Because nums[0] + nums[1] == 9, we return [0, 1].");
    expect(parsed.constraints).toHaveLength(2);
  });

  it("handles raw problems with explicit title and tags properties", () => {
    const withExplicit: IProblem = {
      _id: "12345",
      title: "Custom Problem",
      slug: "custom-problem",
      tags: ["Dynamic Programming", "Math"],
      description: "Simple problem text without markdown headings.",
      difficulty: "Hard",
      sampleTestCaseUrl: "sample.txt",
      testCasesUrl: "testcases.zip",
      time_limit: 4000,
    };

    const parsed = parseProblem(withExplicit);
    expect(parsed.title).toBe("Custom Problem");
    expect(parsed.slug).toBe("custom-problem");
    expect(parsed.tags).toEqual(["Dynamic Programming", "Math"]);
    expect(parsed.difficulty).toBe("Hard");
    expect(parsed.examples).toHaveLength(1); // fallback example
  });

  it("generates fallback title when no title is found", () => {
    const fallbackProb: IProblem = {
      _id: "9999abcd",
      description: "Simple statement with no markdown header",
      difficulty: "Medium",
      sampleTestCaseUrl: "sample.txt",
      testCasesUrl: "testcases.zip",
      time_limit: 3000,
    };

    const parsed = parseProblem(fallbackProb);
    expect(parsed.title).toBe("Problem abcd");
    expect(parsed.tags).toEqual(["Algorithm"]);
  });
});

describe("verdictHelper utility", () => {
  it("parses PENDING verdict", () => {
    const res = parseVerdict({ status: "PENDING" });
    expect(res.verdict).toBe("Pending");
    expect(res.summary).toContain("Judging");
  });

  it("parses COMPILE_ERROR verdict", () => {
    const res = parseVerdict({
      status: "COMPILE_ERROR",
      compileError: "error: expected ';' at end of declaration",
    });
    expect(res.verdict).toBe("Compilation Error");
    expect(res.details).toContain("expected ';'");
  });

  it("parses INTERNAL_ERROR verdict", () => {
    const res = parseVerdict({
      status: "INTERNAL_ERROR",
      message: "Docker daemon connection failed",
    });
    expect(res.verdict).toBe("Internal Error");
    expect(res.summary).toBe("Docker daemon connection failed");
  });

  it("parses Accepted SUCCESS verdict", () => {
    const res = parseVerdict({
      status: "SUCCESS",
      passed: 40,
      total: 40,
      failedCases: { tle: [], re: [], wa: [] },
      executionTimeMs: { tc_1: 12, tc_2: 15 },
    });
    expect(res.verdict).toBe("Accepted");
    expect(res.passedCount).toBe(40);
    expect(res.totalCount).toBe(40);
    expect(res.timeMs).toBe(15);
  });

  it("parses Wrong Answer SUCCESS verdict", () => {
    const res = parseVerdict({
      status: "SUCCESS",
      passed: 25,
      total: 40,
      failedCases: { tle: [], re: [], wa: ["tc_26"] },
      executionTimeMs: { tc_1: 10 },
    });
    expect(res.verdict).toBe("Wrong Answer");
    expect(res.summary).toContain("tc_26");
    expect(res.passedCount).toBe(25);
  });

  it("parses TLE SUCCESS verdict", () => {
    const res = parseVerdict({
      status: "SUCCESS",
      passed: 10,
      total: 40,
      failedCases: { tle: ["tc_11"], re: [], wa: [] },
      executionTimeMs: { tc_1: 5 },
    });
    expect(res.verdict).toBe("Time Limit Exceeded");
    expect(res.summary).toContain("tc_11");
  });

  it("parses RE SUCCESS verdict", () => {
    const res = parseVerdict({
      status: "SUCCESS",
      passed: 5,
      total: 40,
      failedCases: { tle: [], re: ["tc_06"], wa: [] },
      executionTimeMs: { tc_1: 2 },
    });
    expect(res.verdict).toBe("Runtime Error");
    expect(res.summary).toContain("tc_06");
  });
});
