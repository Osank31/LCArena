import { ParsedProblem } from "../types/problem.types";

export const SAMPLE_PROBLEMS: ParsedProblem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    timeLimit: 2000,
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 6, we return [0, 1].",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterTemplates: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> solve(vector<int>& nums, int target) {
        // Write your solution here
        return {};
    }
};
`,
      py: `class Solution:
    def solve(self, nums: list[int], target: int) -> list[int]:
        # Write your solution here
        return []
`,
      java: `public class Solution {
    public int[] solve(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}
`,
      js: `class Solution {
    solve(nums, target) {
        // Write your solution here
        return [];
    }
}

module.exports = { Solution };
`,
    },
    sampleTestCaseUrl: "",
    testCasesUrl: "",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
    rawDescription: `# Two Sum

**Topics:** Array, Hash Table
**Difficulty:** Easy

## Description
Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

## Examples
### Example 1
**Input:** \`nums = [2,7,11,15], target = 9\`
**Output:** \`[0,1]\`
**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].

### Example 2
**Input:** \`nums = [3,2,4], target = 6\`
**Output:** \`[1,2]\`
**Explanation:** Because nums[1] + nums[2] == 6, we return [1, 2].

### Example 3
**Input:** \`nums = [3,3], target = 6\`
**Output:** \`[0,1]\`
**Explanation:** Because nums[0] + nums[1] == 6, we return [0, 1].

## Constraints
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.
`,
  },
  {
    id: "reverse-a-string",
    title: "Reverse a String",
    slug: "reverse-a-string",
    difficulty: "Easy",
    tags: ["String", "Two Pointers"],
    timeLimit: 2000,
    statement: `Write a function that reverses a given string.

The input string is provided as a sequence of characters \`s\`. Return the reversed version of the string.`,
    examples: [
      {
        input: 's = "hello"',
        output: '"olleh"',
        explanation: 'The reversed sequence of characters for "hello" is "olleh".',
      },
      {
        input: 's = "LCArena"',
        output: '"anerACL"',
        explanation: "Characters are reversed while preserving individual casing.",
      },
      {
        input: 's = "racecar"',
        output: '"racecar"',
        explanation: '"racecar" is a palindrome, so its reverse is identical.',
      },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists of printable ASCII characters.",
    ],
    starterTemplates: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    string solve(string s) {
        // Write your solution here
        return "";
    }
};
`,
      py: `class Solution:
    def solve(self, s: str) -> str:
        # Write your solution here
        return ""
`,
      java: `public class Solution {
    public String solve(String s) {
        // Write your solution here
        return "";
    }
}
`,
      js: `class Solution {
    solve(s) {
        // Write your solution here
        return "";
    }
}

module.exports = { Solution };
`,
    },
    sampleTestCaseUrl: "",
    testCasesUrl: "",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
    rawDescription: `# Reverse a String

**Topics:** String, Two Pointers
**Difficulty:** Easy

## Description
Write a function that reverses a given string.

The input string is provided as a sequence of characters \`s\`. Return the reversed version of the string.

## Examples
### Example 1
**Input:** \`s = "hello"\`
**Output:** \`"olleh"\`
**Explanation:** The reversed sequence of characters for "hello" is "olleh".

### Example 2
**Input:** \`s = "LCArena"\`
**Output:** \`"anerACL"\`
**Explanation:** Characters are reversed while preserving individual casing.

### Example 3
**Input:** \`s = "racecar"\`
**Output:** \`"racecar"\`
**Explanation:** "racecar" is a palindrome, so its reverse is identical.

## Constraints
- 1 <= s.length <= 10^5
- s consists of printable ASCII characters.
`,
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    timeLimit: 2000,
    statement: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "The round bracket is closed immediately with matching type.",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All bracket pairs are closed in proper nested order.",
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "Mismatched bracket types: round opener with square closer.",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only: '()[]{}'.",
    ],
    starterTemplates: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    bool solve(string s) {
        // Write your solution here
        return false;
    }
};
`,
      py: `class Solution:
    def solve(self, s: str) -> bool:
        # Write your solution here
        return False
`,
      java: `public class Solution {
    public boolean solve(String s) {
        // Write your solution here
        return false;
    }
}
`,
      js: `class Solution {
    solve(s) {
        // Write your solution here
        return false;
    }
}

module.exports = { Solution };
`,
    },
    sampleTestCaseUrl: "",
    testCasesUrl: "",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
    rawDescription: `# Valid Parentheses

**Topics:** String, Stack
**Difficulty:** Easy

## Description
Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

## Examples
### Example 1
**Input:** \`s = "()"\`
**Output:** \`true\`
**Explanation:** The round bracket is closed immediately with matching type.

### Example 2
**Input:** \`s = "()[]{}"\`
**Output:** \`true\`
**Explanation:** All bracket pairs are closed in proper nested order.

### Example 3
**Input:** \`s = "(]"\`
**Output:** \`false\`
**Explanation:** Mismatched bracket types: round opener with square closer.

## Constraints
- 1 <= s.length <= 10^4
- s consists of parentheses only: '()[]{}'.
`,
  },
  {
    id: "maximum-subarray-sum",
    title: "Maximum Subarray Sum",
    slug: "maximum-subarray-sum",
    difficulty: "Medium",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    timeLimit: 2000,
    statement: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The contiguous subarray [4,-1,2,1] has the largest sum = 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum = 1.",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The contiguous subarray [5,4,-1,7,8] has the largest sum = 23.",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterTemplates: {
      cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int solve(vector<int>& nums) {
        // Write your solution here
        return 0;
    }
};
`,
      py: `class Solution:
    def solve(self, nums: list[int]) -> int:
        # Write your solution here
        return 0
`,
      java: `public class Solution {
    public int solve(int[] nums) {
        // Write your solution here
        return 0;
    }
}
`,
      js: `class Solution {
    solve(nums) {
        // Write your solution here
        return 0;
    }
}

module.exports = { Solution };
`,
    },
    sampleTestCaseUrl: "",
    testCasesUrl: "",
    createdAt: "2026-10-12T00:00:00.000Z",
    updatedAt: "2026-10-12T00:00:00.000Z",
    rawDescription: `# Maximum Subarray Sum

**Topics:** Array, Divide and Conquer, Dynamic Programming
**Difficulty:** Medium

## Description
Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

## Examples
### Example 1
**Input:** \`nums = [-2,1,-3,4,-1,2,1,-5,4]\`
**Output:** \`6\`
**Explanation:** The contiguous subarray [4,-1,2,1] has the largest sum = 6.

### Example 2
**Input:** \`nums = [1]\`
**Output:** \`1\`
**Explanation:** The subarray [1] has the largest sum = 1.

### Example 3
**Input:** \`nums = [5,4,-1,7,8]\`
**Output:** \`23\`
**Explanation:** The contiguous subarray [5,4,-1,7,8] has the largest sum = 23.

## Constraints
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4
`,
  },
];

/**
 * Returns all built-in sample problems.
 */
export function getSampleProblems(): ParsedProblem[] {
  return SAMPLE_PROBLEMS;
}

/**
 * Finds a sample problem by ID, slug, or index.
 */
export function getSampleProblemById(idOrSlug: string): ParsedProblem | undefined {
  if (!idOrSlug) return undefined;
  const target = idOrSlug.trim().toLowerCase();

  return SAMPLE_PROBLEMS.find((problem, index) => {
    if (problem.id.toLowerCase() === target) return true;
    if (problem.slug.toLowerCase() === target) return true;
    if (String(index + 1) === target) return true;
    return false;
  });
}
