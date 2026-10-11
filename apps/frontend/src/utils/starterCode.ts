import { SupportedLanguage } from "../types/submission.types";

export const DEFAULT_STARTER_CODE: Record<SupportedLanguage, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int solve(vector<vector<int>>& points) {
        // Write your solution here
        return 0;
    }
};
`,
  py: `class Solution:
    def solve(self, points: list[list[int]]) -> int:
        # Write your solution here
        return 0
`,
  java: `public class Solution {
    public int solve(int[][] points) {
        // Write your solution here
        return 0;
    }
}
`,
  js: `class Solution {
    solve(points) {
        // Write your solution here
        return 0;
    }
}

module.exports = { Solution };
`,
};

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; monacoLang: string }[] = [
  { value: "cpp", label: "C++ (GCC 13)", monacoLang: "cpp" },
  { value: "py", label: "Python 3.11", monacoLang: "python" },
  { value: "java", label: "Java 21", monacoLang: "java" },
  { value: "js", label: "JavaScript (Node 20)", monacoLang: "javascript" },
];
