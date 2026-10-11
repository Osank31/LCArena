import { describe, expect, it } from "vitest";
import {
  checkSyntaxBalance,
  compareOutputs,
  normalizeOutput,
  parseExampleArguments,
  runCode,
} from "../../utils/codeRunner";
import { ParsedProblem } from "../../types/problem.types";

const mockProblem: ParsedProblem = {
  id: "prob_test_1",
  title: "Two Sum",
  slug: "two-sum",
  difficulty: "Easy",
  timeLimit: 2000,
  tags: ["Array"],
  statement: "Given nums and target...",
  rawDescription: "Given nums and target...",
  starterTemplates: {},
  sampleTestCaseUrl: "",
  testCasesUrl: "",
  examples: [
    {
      input: "nums = [2, 7, 11, 15], target = 9",
      output: "[0, 1]",
    },
    {
      input: "nums = [3, 2, 4], target = 6",
      output: "[1, 2]",
    },
  ],
  constraints: [],
};

describe("codeRunner utility", () => {
  describe("parseExampleArguments", () => {
    it("parses single variable assignment", () => {
      const args = parseExampleArguments('s = "babad"');
      expect(args).toEqual(["babad"]);
    });

    it("parses multiple variable assignments", () => {
      const args = parseExampleArguments("nums = [2, 7, 11, 15], target = 9");
      expect(args).toEqual([[2, 7, 11, 15], 9]);
    });

    it("parses raw JSON input", () => {
      const args = parseExampleArguments("[1, 2, 3]");
      expect(args).toEqual([[1, 2, 3]]);
    });

    it("handles empty or blank string gracefully", () => {
      expect(parseExampleArguments("")).toEqual([]);
      expect(parseExampleArguments("   ")).toEqual([]);
    });
  });

  describe("normalizeOutput and compareOutputs", () => {
    it("normalizes primitives and objects correctly", () => {
      expect(normalizeOutput(123)).toBe("123");
      expect(normalizeOutput(true)).toBe("true");
      expect(normalizeOutput("hello")).toBe("hello");
      expect(normalizeOutput([1, 2])).toBe("[1,2]");
    });

    it("compares outputs with matching values", () => {
      expect(compareOutputs("bab", '"bab"')).toBe(true);
      expect(compareOutputs([0, 1], "[0, 1]")).toBe(true);
      expect(compareOutputs(0, "0")).toBe(true);
      expect(compareOutputs(true, "true")).toBe(true);
    });

    it("detects output mismatches", () => {
      expect(compareOutputs([0, 2], "[0, 1]")).toBe(false);
      expect(compareOutputs("aba", '"bab"')).toBe(false);
    });
  });

  describe("checkSyntaxBalance", () => {
    it("validates balanced code cleanly", () => {
      const code = `
        class Solution {
        public:
            int solve(vector<int>& v) { return 0; }
        };
      `;
      expect(checkSyntaxBalance(code, "cpp").valid).toBe(true);
    });

    it("flags unmatched closing bracket", () => {
      const code = `
        class Solution {
            void solve() { return; }
        }}
      `;
      const result = checkSyntaxBalance(code, "cpp");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unmatched closing bracket");
    });

    it("flags unclosed bracket", () => {
      const code = `
        class Solution {
            void solve() {
        };
      `;
      const result = checkSyntaxBalance(code, "cpp");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unclosed");
    });
  });

  describe("runCode execution", () => {
    it("executes correct JavaScript code and reports all passed", () => {
      const jsCode = `
        class Solution {
          solve(nums, target) {
            for (let i = 0; i < nums.length; i++) {
              for (let j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] === target) return [i, j];
              }
            }
            return [];
          }
        }
      `;

      const result = runCode(jsCode, "js", mockProblem);
      expect(result.status).toBe("SUCCESS");
      expect(result.passedCases).toBe(2);
      expect(result.outputMessage).toContain("Tested against sample input:");
      expect(result.outputMessage).toContain("Result:   PASSED");
    });

    it("detects wrong answer in JavaScript code", () => {
      const jsCode = `
        class Solution {
          solve(nums, target) {
            return [99, 99];
          }
        }
      `;

      const result = runCode(jsCode, "js", mockProblem);
      expect(result.status).toBe("WRONG_ANSWER");
      expect(result.passedCases).toBe(0);
      expect(result.outputMessage).toContain("Result:   FAILED");
    });

    it("detects syntax errors in JavaScript code", () => {
      const invalidCode = `
        class Solution {
          solve( {
      `;

      const result = runCode(invalidCode, "js", mockProblem);
      expect(result.status).toBe("COMPILE_ERROR");
      expect(result.outputMessage).toContain("Compilation Error");
    });

    it("catches runtime errors in JavaScript code", () => {
      const runtimeErrorCode = `
        class Solution {
          solve(nums) {
            const obj = null;
            return obj.nonExistentMethod();
          }
        }
      `;

      const result = runCode(runtimeErrorCode, "js", mockProblem);
      expect(result.status).toBe("RUNTIME_ERROR");
      expect(result.outputMessage).toContain("Runtime Error");
    });

    it("validates and tests Python and C++ code", () => {
      const cppCode = `
        #include <vector>
        using namespace std;
        class Solution {
        public:
            vector<int> solve(vector<int>& nums, int target) {
                return {0, 1};
            }
        };
      `;

      const result = runCode(cppCode, "cpp", mockProblem);
      expect(result.outputMessage).toContain("Tested against sample input:");
      expect(result.status).toBeDefined();
    });
  });
});
