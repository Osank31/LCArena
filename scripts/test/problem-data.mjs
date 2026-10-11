/**
 * 50 Realistic Coding Problems for LCArena
 * 
 * Distribution:
 * - 15 Easy problems
 * - 25 Medium problems
 * - 10 Hard problems
 * 
 * Topics:
 * Arrays, Strings, Hashing, Two Pointers, Sliding Window, Binary Search,
 * Stacks, Queues, Linked Lists, Trees, Graphs, Heaps, Greedy, Backtracking, DP.
 */

export const PROBLEMS = [
  // ==========================================
  // EASY PROBLEMS (1 - 15)
  // ==========================================
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    time_limit: 2000,
    statement: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "nums[1] + nums[2] == 2 + 4 == 6, so return [1, 2]."
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: "nums[0] + nums[1] == 3 + 3 == 6, so return [0, 1]."
      }
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> solve(vector<vector<int>>& points) {
        // Implementation here
        return {};
    }
};`,
      python: `class Solution:
    def solve(self, points: list[list[int]]) -> int:
        # Implementation here
        return 0`,
      java: `public class Solution {
    public int solve(int[][] points) {
        // Implementation here
        return 0;
    }
}`,
      js: `class Solution {
    solve(points) {
        // Implementation here
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    time_limit: 2000,
    statement: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "The parentheses match correctly."
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All bracket types match and close in order."
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "Mismatch between '(' and ']'."
      }
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Implementation here
        return true;
    }
};`,
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Implementation here
        return True`,
      java: `public class Solution {
    public boolean isValid(String s) {
        // Implementation here
        return true;
    }
}`,
      js: `class Solution {
    isValid(s) {
        // Implementation here
        return true;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Merge Two Sorted Lists",
    slug: "merge-two-sorted-lists",
    difficulty: "Easy",
    tags: ["Linked List", "Recursion", "Two Pointers"],
    time_limit: 2000,
    statement: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.`,
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
        explanation: "Merged in ascending numerical order."
      },
      {
        input: "list1 = [], list2 = []",
        output: "[]",
        explanation: "Both lists empty."
      }
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        return nullptr;
    }
};`,
      python: `class Solution:
    def mergeTwoLists(self, list1, list2):
        return None`,
      java: `public class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        return null;
    }
}`,
      js: `class Solution {
    mergeTwoLists(list1, list2) {
        return null;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Best Time to Buy and Sell Stock",
    slug: "best-time-to-buy-and-sell-stock",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    time_limit: 2000,
    statement: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`-th day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "In this case, no transactions are done and the max profit = 0."
      }
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        return 0;
    }
};`,
      python: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int maxProfit(int[] prices) {
        return 0;
    }
}`,
      js: `class Solution {
    maxProfit(prices) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Valid Palindrome",
    slug: "valid-palindrome",
    difficulty: "Easy",
    tags: ["Two Pointers", "String"],
    time_limit: 2000,
    statement: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.'
      },
      {
        input: 's = "race a car"',
        output: "false",
        explanation: '"raceacar" is not a palindrome.'
      }
    ],
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists only of printable ASCII characters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool isPalindrome(string s) {
        return true;
    }
};`,
      python: `class Solution:
    def isPalindrome(self, s: str) -> bool:
        return True`,
      java: `public class Solution {
    public boolean isPalindrome(String s) {
        return true;
    }
}`,
      js: `class Solution {
    isPalindrome(s) {
        return true;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Invert Binary Tree",
    slug: "invert-binary-tree",
    difficulty: "Easy",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    time_limit: 2000,
    statement: `Given the \`root\` of a binary tree, invert the tree, and return its root.`,
    examples: [
      {
        input: "root = [4,2,7,1,3,6,9]",
        output: "[4,7,2,9,6,3,1]",
        explanation: "Each left and right child swapped across the tree."
      },
      {
        input: "root = [2,1,3]",
        output: "[2,3,1]",
        explanation: "Children 1 and 3 swapped."
      }
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        return root;
    }
};`,
      python: `class Solution:
    def invertTree(self, root):
        return root`,
      java: `public class Solution {
    public TreeNode invertTree(TreeNode root) {
        return root;
    }
}`,
      js: `class Solution {
    invertTree(root) {
        return root;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Binary Search",
    slug: "binary-search",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    time_limit: 2000,
    statement: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      {
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
        explanation: "9 exists in nums and its index is 4."
      },
      {
        input: "nums = [-1,0,3,5,9,12], target = 2",
        output: "-1",
        explanation: "2 does not exist in nums so return -1."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 < nums[i], target < 10^4",
      "All integers in nums are unique.",
      "nums is sorted in ascending order."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        return -1;
    }
};`,
      python: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        return -1`,
      java: `public class Solution {
    public int search(int[] nums, int target) {
        return -1;
    }
}`,
      js: `class Solution {
    search(nums, target) {
        return -1;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "Easy",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    time_limit: 2000,
    statement: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6."
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1."
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The subarray [5,4,-1,7,8] has the largest sum 23."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int maxSubArray(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    maxSubArray(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    difficulty: "Easy",
    tags: ["Math", "Dynamic Programming", "Memoization"],
    time_limit: 2000,
    statement: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "There are two ways to climb to the top: 1 step + 1 step, or 2 steps."
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "Three ways: (1+1+1), (1+2), (2+1)."
      }
    ],
    constraints: [
      "1 <= n <= 45"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int climbStairs(int n) {
        return 0;
    }
};`,
      python: `class Solution:
    def climbStairs(self, n: int) -> int:
        return 0`,
      java: `public class Solution {
    public int climbStairs(int n) {
        return 0;
    }
}`,
      js: `class Solution {
    climbStairs(n) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "Easy",
    tags: ["Linked List", "Recursion"],
    time_limit: 2000,
    statement: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: "Pointers inverted across all nodes."
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
        explanation: "Two elements reversed."
      }
    ],
    constraints: [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 <= Node.val <= 5000"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        return nullptr;
    }
};`,
      python: `class Solution:
    def reverseList(self, head):
        return None`,
      java: `public class Solution {
    public ListNode reverseList(ListNode head) {
        return null;
    }
}`,
      js: `class Solution {
    reverseList(head) {
        return null;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Single Number",
    slug: "single-number",
    difficulty: "Easy",
    tags: ["Array", "Bit Manipulation"],
    time_limit: 2000,
    statement: `Given a non-empty array of integers \`nums\`, every element appears twice except for one. Find that single one.

You must implement a solution with a linear runtime complexity and use only constant extra space.`,
    examples: [
      {
        input: "nums = [2,2,1]",
        output: "1",
        explanation: "1 appears once."
      },
      {
        input: "nums = [4,1,2,1,2]",
        output: "4",
        explanation: "4 appears once while others appear twice."
      }
    ],
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-3 * 10^4 <= nums[i] <= 3 * 10^4",
      "Each element in the array appears twice except for one element which appears only once."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int singleNumber(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int singleNumber(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    singleNumber(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    difficulty: "Easy",
    tags: ["Array", "Hash Table", "Sorting"],
    time_limit: 2000,
    statement: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
        explanation: "1 appears at index 0 and 3."
      },
      {
        input: "nums = [1,2,3,4]",
        output: "false",
        explanation: "All elements are distinct."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        return false;
    }
};`,
      python: `class Solution:
    def containsDuplicate(self, nums: list[int]) -> bool:
        return False`,
      java: `public class Solution {
    public boolean containsDuplicate(int[] nums) {
        return false;
    }
}`,
      js: `class Solution {
    containsDuplicate(nums) {
        return false;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Intersection of Two Arrays",
    slug: "intersection-of-two-arrays",
    difficulty: "Easy",
    tags: ["Array", "Hash Table", "Two Pointers", "Binary Search", "Sorting"],
    time_limit: 2000,
    statement: `Given two integer arrays \`nums1\` and \`nums2\`, return an array of their intersection. Each element in the result must be unique and you may return the result in any order.`,
    examples: [
      {
        input: "nums1 = [1,2,2,1], nums2 = [2,2]",
        output: "[2]",
        explanation: "2 is present in both arrays."
      },
      {
        input: "nums1 = [4,9,5], nums2 = [9,4,9,8,4]",
        output: "[9,4]",
        explanation: "[4,9] is also accepted."
      }
    ],
    constraints: [
      "1 <= nums1.length, nums2.length <= 1000",
      "0 <= nums1[i], nums2[i] <= 1000"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> intersection(vector<int>& nums1, vector<int>& nums2) {
        return {};
    }
};`,
      python: `class Solution:
    def intersection(self, nums1: list[int], nums2: list[int]) -> list[int]:
        return []`,
      java: `public class Solution {
    public int[] intersection(int[] nums1, int[] nums2) {
        return new int[0];
    }
}`,
      js: `class Solution {
    intersection(nums1, nums2) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Majority Element",
    slug: "majority-element",
    difficulty: "Easy",
    tags: ["Array", "Hash Table", "Divide and Conquer", "Sorting", "Counting"],
    time_limit: 2000,
    statement: `Given an array \`nums\` of size \`n\`, return the majority element.

The majority element is the element that appears more than \`floor(n / 2)\` times. You may assume that the majority element always exists in the array.`,
    examples: [
      {
        input: "nums = [3,2,3]",
        output: "3",
        explanation: "3 appears 2 times, which is > 3/2 = 1."
      },
      {
        input: "nums = [2,2,1,1,1,2,2]",
        output: "2",
        explanation: "2 appears 4 times, which is > 7/2 = 3."
      }
    ],
    constraints: [
      "n == nums.length",
      "1 <= n <= 5 * 10^4",
      "-10^9 <= nums[i] <= 10^9"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int majorityElement(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def majorityElement(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int majorityElement(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    majorityElement(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Valid Anagram",
    slug: "valid-anagram",
    difficulty: "Easy",
    tags: ["Hash Table", "String", "Sorting"],
    time_limit: 2000,
    statement: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 's = "anagram", t = "nagaram"',
        output: "true",
        explanation: "Both strings have the exact same character frequencies."
      },
      {
        input: 's = "rat", t = "car"',
        output: "false",
        explanation: "Characters do not match."
      }
    ],
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool isAnagram(string s, string t) {
        return false;
    }
};`,
      python: `class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        return False`,
      java: `public class Solution {
    public boolean isAnagram(String s, String t) {
        return false;
    }
}`,
      js: `class Solution {
    isAnagram(s, t) {
        return false;
    }
}

module.exports = { Solution };`
    }
  },

  // ==========================================
  // MEDIUM PROBLEMS (16 - 40)
  // ==========================================
  {
    title: "3Sum",
    slug: "3sum",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Sorting"],
    time_limit: 3000,
    statement: `Given an integer array nums, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      {
        input: "nums = [-1,0,1,2,-1,-4]",
        output: "[[-1,-1,2],[-1,0,1]]",
        explanation: "Distinct triplets summing to zero."
      },
      {
        input: "nums = [0,1,1]",
        output: "[]",
        explanation: "The only possible triplet does not sum up to 0."
      }
    ],
    constraints: [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        return {};
    }
};`,
      python: `class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        return []`,
      java: `public class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    threeSum(nums) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    tags: ["Hash Table", "String", "Sliding Window"],
    time_limit: 3000,
    statement: `Given a string \`s\`, find the length of the longest substring without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with the length of 3.'
      }
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        return 0;
    }
};`,
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        return 0`,
      java: `public class Solution {
    public int lengthOfLongestSubstring(String s) {
        return 0;
    }
}`,
      js: `class Solution {
    lengthOfLongestSubstring(s) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Container With Most Water",
    slug: "container-with-most-water",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Greedy"],
    time_limit: 3000,
    statement: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i\`-th line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store. Notice that you may not slant the container.`,
    examples: [
      {
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "Between indices 1 and 8 (heights 8 and 7, width 7), area = 7 * min(8, 7) = 49."
      },
      {
        input: "height = [1,1]",
        output: "1",
        explanation: "1 * 1 = 1."
      }
    ],
    constraints: [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int maxArea(vector<int>& height) {
        return 0;
    }
};`,
      python: `class Solution:
    def maxArea(self, height: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int maxArea(int[] height) {
        return 0;
    }
}`,
      js: `class Solution {
    maxArea(height) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Group Anagrams",
    slug: "group-anagrams",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "String", "Sorting"],
    time_limit: 3000,
    statement: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
        explanation: "Grouped by identical character counts."
      },
      {
        input: 'strs = [""]',
        output: '[[""]]',
        explanation: "Single empty string."
      }
    ],
    constraints: [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        return {};
    }
};`,
      python: `class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        return []`,
      java: `public class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    groupAnagrams(strs) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Product of Array Except Self",
    slug: "product-of-array-except-self",
    difficulty: "Medium",
    tags: ["Array", "Prefix Sum"],
    time_limit: 3000,
    statement: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.

The product of any prefix or suffix of \`nums\` is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in \`O(n)\` time and without using the division operation.`,
    examples: [
      {
        input: "nums = [1,2,3,4]",
        output: "[24,12,8,6]",
        explanation: "At index 0: 2*3*4=24. At index 1: 1*3*4=12. Etc."
      },
      {
        input: "nums = [-1,1,0,-3,3]",
        output: "[0,0,9,0,0]",
        explanation: "Zero handling via prefix/suffix products."
      }
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> productExceptSelf(vector<int>& nums) {
        return {};
    }
};`,
      python: `class Solution:
    def productExceptSelf(self, nums: list[int]) -> list[int]:
        return []`,
      java: `public class Solution {
    public int[] productExceptSelf(int[] nums) {
        return new int[0];
    }
}`,
      js: `class Solution {
    productExceptSelf(nums) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Search in Rotated Sorted Array",
    slug: "search-in-rotated-sorted-array",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    time_limit: 3000,
    statement: `There is an integer array \`nums\` sorted in ascending order (with distinct values).

Prior to being passed to your function, \`nums\` is possibly rotated at an unknown pivot index \`k\` (1 <= k < nums.length).

Given the array \`nums\` after the possible rotation and an integer \`target\`, return the index of \`target\` if it is in \`nums\`, or \`-1\` if it is not in \`nums\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      {
        input: "nums = [4,5,6,7,0,1,2], target = 0",
        output: "4",
        explanation: "0 found at index 4."
      },
      {
        input: "nums = [4,5,6,7,0,1,2], target = 3",
        output: "-1",
        explanation: "3 not in nums."
      }
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
      "nums is an ascending array that is possibly rotated."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int search(vector<int>& nums, int target) {
        return -1;
    }
};`,
      python: `class Solution:
    def search(self, nums: list[int], target: int) -> int:
        return -1`,
      java: `public class Solution {
    public int search(int[] nums, int target) {
        return -1;
    }
}`,
      js: `class Solution {
    search(nums, target) {
        return -1;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Combination Sum",
    slug: "combination-sum",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    time_limit: 3000,
    statement: `Given an array of distinct integers \`candidates\` and a target integer \`target\`, return a list of all unique combinations of \`candidates\` where the chosen numbers sum to \`target\`. You may return the combinations in any order.

The same number may be chosen from \`candidates\` an unlimited number of times. Two combinations are unique if the frequency of at least one of the chosen numbers is different.`,
    examples: [
      {
        input: "candidates = [2,3,6,7], target = 7",
        output: "[[2,2,3],[7]]",
        explanation: "2 and 3 are candidates, and 2 + 2 + 3 = 7. 7 is a candidate, and 7 = 7."
      },
      {
        input: "candidates = [2,3,5], target = 8",
        output: "[[2,2,2,2],[2,3,3],[3,5]]",
        explanation: "Three distinct valid combinations."
      }
    ],
    constraints: [
      "1 <= candidates.length <= 30",
      "2 <= candidates[i] <= 40",
      "All elements of candidates are distinct.",
      "1 <= target <= 40"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        return {};
    }
};`,
      python: `class Solution:
    def combinationSum(self, candidates: list[int], target: int) -> list[list[int]]:
        return []`,
      java: `public class Solution {
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    combinationSum(candidates, target) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Permutations",
    slug: "permutations",
    difficulty: "Medium",
    tags: ["Array", "Backtracking"],
    time_limit: 3000,
    statement: `Given an array \`nums\` of distinct integers, return all the possible permutations. You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [1,2,3]",
        output: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]",
        explanation: "All 6 permutations."
      },
      {
        input: "nums = [0,1]",
        output: "[[0,1],[1,0]]",
        explanation: "2 permutations."
      }
    ],
    constraints: [
      "1 <= nums.length <= 6",
      "-10 <= nums[i] <= 10",
      "All the integers of nums are unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        return {};
    }
};`,
      python: `class Solution:
    def permute(self, nums: list[int]) -> list[list[int]]:
        return []`,
      java: `public class Solution {
    public List<List<Integer>> permute(int[] nums) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    permute(nums) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Subsets",
    slug: "subsets",
    difficulty: "Medium",
    tags: ["Array", "Backtracking", "Bit Manipulation"],
    time_limit: 3000,
    statement: `Given an integer array \`nums\` of unique elements, return all possible subsets (the power set).

The solution set must not contain duplicate subsets. Return the solution in any order.`,
    examples: [
      {
        input: "nums = [1,2,3]",
        output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]",
        explanation: "2^3 = 8 subsets."
      },
      {
        input: "nums = [0]",
        output: "[[],[0]]",
        explanation: "2 subsets."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10",
      "All the numbers of nums are unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        return {};
    }
};`,
      python: `class Solution:
    def subsets(self, nums: list[int]) -> list[list[int]]:
        return []`,
      java: `public class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    subsets(nums) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Word Search",
    slug: "word-search",
    difficulty: "Medium",
    tags: ["Array", "Backtracking", "Matrix"],
    time_limit: 3000,
    statement: `Given an \`m x n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.`,
    examples: [
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        output: "true",
        explanation: "Found along top and center rows."
      },
      {
        input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
        output: "true",
        explanation: "Found along right edge."
      }
    ],
    constraints: [
      "m == board.length",
      "n = board[i].length",
      "1 <= m, n <= 6",
      "1 <= word.length <= 15",
      "board and word consist of only lowercase and uppercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        return false;
    }
};`,
      python: `class Solution:
    def exist(self, board: list[list[str]], word: str) -> bool:
        return False`,
      java: `public class Solution {
    public boolean exist(char[][] board, String word) {
        return false;
    }
}`,
      js: `class Solution {
    exist(board, word) {
        return false;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Number of Islands",
    slug: "number-of-islands",
    difficulty: "Medium",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"],
    time_limit: 3000,
    statement: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
        output: "1",
        explanation: "Single connected component of land."
      },
      {
        input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
        output: "3",
        explanation: "Three separate island clusters."
      }
    ],
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        return 0;
    }
};`,
      python: `class Solution:
    def numIslands(self, grid: list[list[str]]) -> int:
        return 0`,
      java: `public class Solution {
    public int numIslands(char[][] grid) {
        return 0;
    }
}`,
      js: `class Solution {
    numIslands(grid) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Course Schedule",
    slug: "course-schedule",
    difficulty: "Medium",
    tags: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"],
    time_limit: 3000,
    statement: `There are a total of \`numCourses\` courses you have to take, labeled from \`0\` to \`numCourses - 1\`. You are given an array \`prerequisites\` where \`prerequisites[i] = [ai, bi]\` indicates that you must take course \`bi\` first if you want to take course \`ai\`.

Return \`true\` if you can finish all courses. Otherwise, return \`false\`.`,
    examples: [
      {
        input: "numCourses = 2, prerequisites = [[1,0]]",
        output: "true",
        explanation: "Take course 0 then course 1."
      },
      {
        input: "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        output: "false",
        explanation: "Cyclic dependency between 0 and 1."
      }
    ],
    constraints: [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= 5000",
      "prerequisites[i].length == 2",
      "0 <= ai, bi < numCourses",
      "All prerequisite pairs are unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        return true;
    }
};`,
      python: `class Solution:
    def canFinish(self, numCourses: int, prerequisites: list[list[int]]) -> bool:
        return True`,
      java: `public class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        return true;
    }
}`,
      js: `class Solution {
    canFinish(numCourses, prerequisites) {
        return true;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Pacific Atlantic Water Flow",
    slug: "pacific-atlantic-water-flow",
    difficulty: "Medium",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
    time_limit: 3000,
    statement: `There is an \`m x n\` rectangular island that borders both the Pacific Ocean and Atlantic Ocean. The Pacific Ocean touches the island's left and top edges, and the Atlantic Ocean touches the island's right and bottom edges.

Return a 2D list of grid coordinates \`result\` where \`result[i] = [ri, ci]\` denotes that rain water can flow from cell \`(ri, ci)\` to both the Pacific and Atlantic oceans.`,
    examples: [
      {
        input: "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        output: "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]",
        explanation: "Coordinates where water reaches both oceans."
      }
    ],
    constraints: [
      "m == heights.length",
      "n == heights[r].length",
      "1 <= m, n <= 200",
      "0 <= heights[r][c] <= 10^5"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {
        return {};
    }
};`,
      python: `class Solution:
    def pacificAtlantic(self, heights: list[list[int]]) -> list[list[int]]:
        return []`,
      java: `public class Solution {
    public List<List<Integer>> pacificAtlantic(int[][] heights) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    pacificAtlantic(heights) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Coin Change",
    slug: "coin-change",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming", "Breadth-First Search"],
    time_limit: 3000,
    statement: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: "coins = [1,2,5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1 (3 coins)."
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1",
        explanation: "Cannot make 3 with only 2s."
      },
      {
        input: "coins = [1], amount = 0",
        output: "0",
        explanation: "0 coins needed for 0 amount."
      }
    ],
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int coinChange(vector<int>& coins, int amount) {
        return -1;
    }
};`,
      python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        return -1`,
      java: `public class Solution {
    public int coinChange(int[] coins, int amount) {
        return -1;
    }
}`,
      js: `class Solution {
    coinChange(coins, amount) {
        return -1;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Longest Increasing Subsequence",
    slug: "longest-increasing-subsequence",
    difficulty: "Medium",
    tags: ["Array", "Binary Search", "Dynamic Programming"],
    time_limit: 3000,
    statement: `Given an integer array \`nums\`, return the length of the longest strictly increasing subsequence.`,
    examples: [
      {
        input: "nums = [10,9,2,5,3,7,101,18]",
        output: "4",
        explanation: "The longest increasing subsequence is [2,3,7,101], length 4."
      },
      {
        input: "nums = [0,1,0,3,2,3]",
        output: "4",
        explanation: "Subsequence [0,1,2,3], length 4."
      }
    ],
    constraints: [
      "1 <= nums.length <= 2500",
      "-10^4 <= nums[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int lengthOfLIS(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def lengthOfLIS(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int lengthOfLIS(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    lengthOfLIS(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Word Break",
    slug: "word-break",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "String", "Dynamic Programming", "Trie", "Memoization"],
    time_limit: 3000,
    statement: `Given a string \`s\` and a dictionary of strings \`wordDict\`, return \`true\` if \`s\` can be segmented into a space-separated sequence of one or more dictionary words.

Note that the same word in the dictionary may be reused multiple times in the segmentation.`,
    examples: [
      {
        input: 's = "leetcode", wordDict = ["leet","code"]',
        output: "true",
        explanation: 'Return true because "leetcode" can be segmented as "leet code".'
      },
      {
        input: 's = "applepenapple", wordDict = ["apple","pen"]',
        output: "true",
        explanation: 'Segmented as "apple pen apple".'
      }
    ],
    constraints: [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000",
      "1 <= wordDict[i].length <= 20",
      "s and wordDict[i] consist of only lowercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool wordBreak(string s, vector<string>& wordDict) {
        return false;
    }
};`,
      python: `class Solution:
    def wordBreak(self, s: str, wordDict: list[str]) -> bool:
        return False`,
      java: `public class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        return false;
    }
}`,
      js: `class Solution {
    wordBreak(s, wordDict) {
        return false;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Decode Ways",
    slug: "decode-ways",
    difficulty: "Medium",
    tags: ["String", "Dynamic Programming"],
    time_limit: 3000,
    statement: `A message containing letters from A-Z can be encoded into numbers using the mapping: 'A' -> "1", 'B' -> "2", ..., 'Z' -> "26".

To decode an encoded message, all the digits must be grouped then mapped back into letters. Given a string \`s\` containing only digits, return the number of ways to decode it.`,
    examples: [
      {
        input: 's = "12"',
        output: "2",
        explanation: '"12" could be decoded as "AB" (1 2) or "L" (12).'
      },
      {
        input: 's = "226"',
        output: "3",
        explanation: '"226" could be decoded as "BZ" (2 26), "VF" (22 6), or "BBF" (2 2 6).'
      }
    ],
    constraints: [
      "1 <= s.length <= 100",
      "s contains only digits and may contain leading zero(s)."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int numDecodings(string s) {
        return 0;
    }
};`,
      python: `class Solution:
    def numDecodings(self, s: str) -> int:
        return 0`,
      java: `public class Solution {
    public int numDecodings(String s) {
        return 0;
    }
}`,
      js: `class Solution {
    numDecodings(s) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Unique Paths",
    slug: "unique-paths",
    difficulty: "Medium",
    tags: ["Math", "Dynamic Programming", "Combinatorics"],
    time_limit: 3000,
    statement: `There is a robot on an \`m x n\` grid. The robot is initially located at the top-left corner (\`grid[0][0]\`). The robot tries to move to the bottom-right corner (\`grid[m - 1][n - 1]\`). The robot can only move either down or right at any point in time.

Given the two integers \`m\` and \`n\`, return the number of possible unique paths that the robot can take to reach the bottom-right corner.`,
    examples: [
      {
        input: "m = 3, n = 7",
        output: "28",
        explanation: "28 unique paths from top-left to bottom-right."
      },
      {
        input: "m = 3, n = 2",
        output: "3",
        explanation: "Right->Down->Down, Down->Right->Down, Down->Down->Right."
      }
    ],
    constraints: [
      "1 <= m, n <= 100"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int uniquePaths(int m, int n) {
        return 1;
    }
};`,
      python: `class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        return 1`,
      java: `public class Solution {
    public int uniquePaths(int m, int n) {
        return 1;
    }
}`,
      js: `class Solution {
    uniquePaths(m, n) {
        return 1;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "House Robber",
    slug: "house-robber",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming"],
    time_limit: 3000,
    statement: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night.

Given an integer array \`nums\` representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "4",
        explanation: "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total = 1 + 3 = 4."
      },
      {
        input: "nums = [2,7,9,3,1]",
        output: "12",
        explanation: "Rob house 1 (2), house 3 (9), house 5 (1). Total = 2 + 9 + 1 = 12."
      }
    ],
    constraints: [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 400"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int rob(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def rob(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int rob(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    rob(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Rotate Image",
    slug: "rotate-image",
    difficulty: "Medium",
    tags: ["Array", "Math", "Matrix"],
    time_limit: 3000,
    statement: `You are given an \`n x n\` 2D matrix representing an image, rotate the image by 90 degrees (clockwise).

You have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.`,
    examples: [
      {
        input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        output: "[[7,4,1],[8,5,2],[9,6,3]]",
        explanation: "Rotated 90 degrees clockwise."
      }
    ],
    constraints: [
      "n == matrix.length == matrix[i].length",
      "1 <= n <= 20",
      "-1000 <= matrix[i][j] <= 1000"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        // In-place rotation
    }
};`,
      python: `class Solution:
    def rotate(self, matrix: list[list[int]]) -> None:
        # In-place rotation
        pass`,
      java: `public class Solution {
    public void rotate(int[][] matrix) {
        // In-place rotation
    }
}`,
      js: `class Solution {
    rotate(matrix) {
        // In-place rotation
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Spiral Matrix",
    slug: "spiral-matrix",
    difficulty: "Medium",
    tags: ["Array", "Matrix", "Simulation"],
    time_limit: 3000,
    statement: `Given an \`m x n\` matrix, return all elements of the matrix in spiral order.`,
    examples: [
      {
        input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        output: "[1,2,3,6,9,8,7,4,5]",
        explanation: "Clockwise spiral traversal."
      }
    ],
    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 10",
      "-100 <= matrix[i][j] <= 100"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        return {};
    }
};`,
      python: `class Solution:
    def spiralOrder(self, matrix: list[list[int]]) -> list[int]:
        return []`,
      java: `public class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        return new ArrayList<>();
    }
}`,
      js: `class Solution {
    spiralOrder(matrix) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Top K Frequent Elements",
    slug: "top-k-frequent-elements",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Divide and Conquer", "Sorting", "Heap (Priority Queue)", "Bucket Sort", "Counting", "Quickselect"],
    time_limit: 3000,
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any order.`,
    examples: [
      {
        input: "nums = [1,1,1,2,2,3], k = 2",
        output: "[1,2]",
        explanation: "1 appears 3 times, 2 appears 2 times."
      },
      {
        input: "nums = [1], k = 1",
        output: "[1]",
        explanation: "1 appears once."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "k is in the range [1, the number of unique elements in the array].",
      "It is guaranteed that the answer is unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        return {};
    }
};`,
      python: `class Solution:
    def topKFrequent(self, nums: list[int], k: int) -> list[int]:
        return []`,
      java: `public class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        return new int[0];
    }
}`,
      js: `class Solution {
    topKFrequent(nums, k) {
        return [];
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Kth Largest Element in an Array",
    slug: "kth-largest-element-in-an-array",
    difficulty: "Medium",
    tags: ["Array", "Divide and Conquer", "Sorting", "Heap (Priority Queue)", "Quickselect"],
    time_limit: 3000,
    statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\`th largest element in the array.

Note that it is the \`k\`th largest element in the sorted order, not the \`k\`th distinct element.

Can you solve it without sorting?`,
    examples: [
      {
        input: "nums = [3,2,1,5,6,4], k = 2",
        output: "5",
        explanation: "The sorted array is [1,2,3,4,5,6], second largest is 5."
      },
      {
        input: "nums = [3,2,3,1,2,4,5,5,6], k = 4",
        output: "4",
        explanation: "4th largest element is 4."
      }
    ],
    constraints: [
      "1 <= k <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        return 0;
    }
};`,
      python: `class Solution:
    def findKthLargest(self, nums: list[int], k: int) -> int:
        return 0`,
      java: `public class Solution {
    public int findKthLargest(int[] nums, int k) {
        return 0;
    }
}`,
      js: `class Solution {
    findKthLargest(nums, k) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Find Minimum in Rotated Sorted Array",
    slug: "find-minimum-in-rotated-sorted-array",
    difficulty: "Medium",
    tags: ["Array", "Binary Search"],
    time_limit: 3000,
    statement: `Suppose an array of length \`n\` sorted in ascending order is rotated between 1 and \`n\` times.

Given the sorted rotated array \`nums\` of unique elements, return the minimum element of this array.

You must write an algorithm that runs in \`O(log n)\` time.`,
    examples: [
      {
        input: "nums = [3,4,5,1,2]",
        output: "1",
        explanation: "Original was [1,2,3,4,5] rotated 3 times."
      },
      {
        input: "nums = [4,5,6,7,0,1,2]",
        output: "0",
        explanation: "Min value is 0."
      }
    ],
    constraints: [
      "n == nums.length",
      "1 <= n <= 5000",
      "-5000 <= nums[i] <= 5000",
      "All the integers of nums are unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int findMin(vector<int>& nums) {
        return 0;
    }
};`,
      python: `class Solution:
    def findMin(self, nums: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int findMin(int[] nums) {
        return 0;
    }
}`,
      js: `class Solution {
    findMin(nums) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Valid Sudoku",
    slug: "valid-sudoku",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Matrix"],
    time_limit: 3000,
    statement: `Determine if a \`9 x 9\` Sudoku board is valid. Only the filled cells need to be validated according to the following rules:

1. Each row must contain the digits 1-9 without repetition.
2. Each column must contain the digits 1-9 without repetition.
3. Each of the nine 3 x 3 sub-boxes of the grid must contain the digits 1-9 without repetition.`,
    examples: [
      {
        input: 'board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],...]',
        output: "true",
        explanation: "No duplicates in any row, column, or 3x3 box."
      }
    ],
    constraints: [
      "board.length == 9",
      "board[i].length == 9",
      "board[i][j] is a digit '1'-'9' or '.'."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool isValidSudoku(vector<vector<char>>& board) {
        return true;
    }
};`,
      python: `class Solution:
    def isValidSudoku(self, board: list[list[str]]) -> bool:
        return True`,
      java: `public class Solution {
    public boolean isValidSudoku(char[][] board) {
        return true;
    }
}`,
      js: `class Solution {
    isValidSudoku(board) {
        return true;
    }
}

module.exports = { Solution };`
    }
  },

  // ==========================================
  // HARD PROBLEMS (41 - 50)
  // ==========================================
  {
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    difficulty: "Hard",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Monotonic Stack"],
    time_limit: 4000,
    statement: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation: "The above elevation map can trap 6 units of rain water."
      },
      {
        input: "height = [4,2,0,3,2,5]",
        output: "9",
        explanation: "Water trapped between elevation boundaries."
      }
    ],
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int trap(vector<int>& height) {
        return 0;
    }
};`,
      python: `class Solution:
    def trap(self, height: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int trap(int[] height) {
        return 0;
    }
}`,
      js: `class Solution {
    trap(height) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    time_limit: 4000,
    statement: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the median of the two sorted arrays.

The overall run time complexity should be \`O(log (m+n))\`.`,
    examples: [
      {
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.00000",
        explanation: "merged array = [1,2,3] and median is 2."
      },
      {
        input: "nums1 = [1,2], nums2 = [3,4]",
        output: "2.50000",
        explanation: "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
      }
    ],
    constraints: [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m <= 1000",
      "0 <= n <= 1000",
      "1 <= m + n <= 2000",
      "-10^6 <= nums1[i], nums2[i] <= 10^6"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        return 0.0;
    }
};`,
      python: `class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        return 0.0`,
      java: `public class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        return 0.0;
    }
}`,
      js: `class Solution {
    findMedianSortedArrays(nums1, nums2) {
        return 0.0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Merge k Sorted Lists",
    slug: "merge-k-sorted-lists",
    difficulty: "Hard",
    tags: ["Linked List", "Divide and Conquer", "Heap (Priority Queue)", "Merge Sort"],
    time_limit: 4000,
    statement: `You are given an array of \`k\` linked-lists \`lists\`, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.`,
    examples: [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1,1,2,3,4,4,5,6]",
        explanation: "Merged together into a single sorted list."
      },
      {
        input: "lists = []",
        output: "[]",
        explanation: "No lists to merge."
      }
    ],
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "lists[i] is sorted in ascending order."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        return nullptr;
    }
};`,
      python: `class Solution:
    def mergeKLists(self, lists):
        return None`,
      java: `public class Solution {
    public ListNode mergeKLists(ListNode[] lists) {
        return null;
    }
}`,
      js: `class Solution {
    mergeKLists(lists) {
        return null;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Longest Valid Parentheses",
    slug: "longest-valid-parentheses",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Stack"],
    time_limit: 4000,
    statement: `Given a string containing just the characters '(' and ')', return the length of the longest valid (well-formed) parentheses substring.`,
    examples: [
      {
        input: 's = "(()"',
        output: "2",
        explanation: 'The longest valid parentheses substring is "()".'
      },
      {
        input: 's = ")()())"',
        output: "4",
        explanation: 'The longest valid parentheses substring is "()()".'
      }
    ],
    constraints: [
      "0 <= s.length <= 3 * 10^4",
      "s[i] is '(' or ')'."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int longestValidParentheses(string s) {
        return 0;
    }
};`,
      python: `class Solution:
    def longestValidParentheses(self, s: str) -> int:
        return 0`,
      java: `public class Solution {
    public int longestValidParentheses(String s) {
        return 0;
    }
}`,
      js: `class Solution {
    longestValidParentheses(s) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Edit Distance",
    slug: "edit-distance",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming"],
    time_limit: 4000,
    statement: `Given two strings \`word1\` and \`word2\`, return the minimum number of operations required to convert \`word1\` to \`word2\`.

You have the following three operations permitted on a word:
1. Insert a character
2. Delete a character
3. Replace a character`,
    examples: [
      {
        input: 'word1 = "horse", word2 = "ros"',
        output: "3",
        explanation: 'horse -> rorse (replace "h" with "r") -> rose (remove "r") -> ros (remove "e").'
      },
      {
        input: 'word1 = "intention", word2 = "execution"',
        output: "5",
        explanation: "5 minimum edits required."
      }
    ],
    constraints: [
      "0 <= word1.length, word2.length <= 500",
      "word1 and word2 consist of lowercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int minDistance(string word1, string word2) {
        return 0;
    }
};`,
      python: `class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        return 0`,
      java: `public class Solution {
    public int minDistance(String word1, String word2) {
        return 0;
    }
}`,
      js: `class Solution {
    minDistance(word1, word2) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Minimum Window Substring",
    slug: "minimum-window-substring",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Sliding Window"],
    time_limit: 4000,
    statement: `Given two strings \`s\` and \`t\` of lengths \`m\` and \`n\` respectively, return the minimum window substring of \`s\` such that every character in \`t\` (including duplicates) is included in the window. If there is no such substring, return the empty string \`""\`.

The testcases will be generated such that the answer is unique.`,
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: '"BANC"',
        explanation: 'The minimum window substring "BANC" includes \'A\', \'B\', and \'C\' from string t.'
      },
      {
        input: 's = "a", t = "a"',
        output: '"a"',
        explanation: "Entire string is the minimum window."
      }
    ],
    constraints: [
      "m == s.length",
      "n == t.length",
      "1 <= m, n <= 10^5",
      "s and t consist of uppercase and lowercase English letters."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    string minWindow(string s, string t) {
        return "";
    }
};`,
      python: `class Solution:
    def minWindow(self, s: str, t: str) -> str:
        return ""`,
      java: `public class Solution {
    public String minWindow(String s, String t) {
        return "";
    }
}`,
      js: `class Solution {
    minWindow(s, t) {
        return "";
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Word Ladder",
    slug: "word-ladder",
    difficulty: "Hard",
    tags: ["Hash Table", "String", "Breadth-First Search"],
    time_limit: 5000,
    statement: `A transformation sequence from word \`beginWord\` to word \`endWord\` using a dictionary \`wordList\` is a sequence of words \`beginWord -> s1 -> s2 -> ... -> sk\` such that:
- Every adjacent pair of words differs by a single letter.
- Every \`si\` for 1 <= i <= k is in \`wordList\`. Note that \`beginWord\` does not need to be in \`wordList\`.
- \`sk == endWord\`

Given two words, \`beginWord\` and \`endWord\`, and a dictionary \`wordList\`, return the number of words in the shortest transformation sequence from \`beginWord\` to \`endWord\`, or 0 if no such sequence exists.`,
    examples: [
      {
        input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
        output: "5",
        explanation: 'One shortest transformation sequence is "hit" -> "hot" -> "dot" -> "dog" -> "cog", which is 5 words long.'
      },
      {
        input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
        output: "0",
        explanation: 'The endWord "cog" is not in wordList, therefore there is no valid transformation sequence.'
      }
    ],
    constraints: [
      "1 <= beginWord.length <= 10",
      "endWord.length == beginWord.length",
      "1 <= wordList.length <= 5000",
      "wordList[i].length == beginWord.length",
      "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
      "beginWord != endWord",
      "All words in wordList are unique."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
        return 0;
    }
};`,
      python: `class Solution:
    def ladderLength(self, beginWord: str, endWord: str, wordList: list[str]) -> int:
        return 0`,
      java: `public class Solution {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        return 0;
    }
}`,
      js: `class Solution {
    ladderLength(beginWord, endWord, wordList) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Regular Expression Matching",
    slug: "regular-expression-matching",
    difficulty: "Hard",
    tags: ["String", "Dynamic Programming", "Recursion"],
    time_limit: 4000,
    statement: `Given an input string \`s\` and a pattern \`p\`, implement regular expression matching with support for '.' and '*' where:
- '.' Matches any single character.
- '*' Matches zero or more of the preceding element.

The matching should cover the entire input string (not partial).`,
    examples: [
      {
        input: 's = "aa", p = "a"',
        output: "false",
        explanation: '"a" does not match the entire string "aa".'
      },
      {
        input: 's = "aa", p = "a*"',
        output: "true",
        explanation: '\'*\' means zero or more of the preceding element, \'a\'. Therefore, by repeating \'a\' once, it becomes "aa".'
      },
      {
        input: 's = "ab", p = ".*"',
        output: "true",
        explanation: '".*" means "zero or more (*) of any character (.)".'
      }
    ],
    constraints: [
      "1 <= s.length <= 20",
      "1 <= p.length <= 20",
      "s contains only lowercase English letters.",
      "p contains only lowercase English letters, '.', and '*'.",
      "It is guaranteed for each appearance of the character '*', there will be a previous valid character to match."
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    bool isMatch(string s, string p) {
        return false;
    }
};`,
      python: `class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        return False`,
      java: `public class Solution {
    public boolean isMatch(String s, String p) {
        return false;
    }
}`,
      js: `class Solution {
    isMatch(s, p) {
        return false;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Largest Rectangle in Histogram",
    slug: "largest-rectangle-in-histogram",
    difficulty: "Hard",
    tags: ["Array", "Stack", "Monotonic Stack"],
    time_limit: 4000,
    statement: `Given an array of integers \`heights\` representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.`,
    examples: [
      {
        input: "heights = [2,1,5,6,2,3]",
        output: "10",
        explanation: "The largest rectangle has area = 10 units (between bars of height 5 and 6, width 2)."
      },
      {
        input: "heights = [2,4]",
        output: "4",
        explanation: "Area 4 (height 4, width 1)."
      }
    ],
    constraints: [
      "1 <= heights.length <= 10^5",
      "0 <= heights[i] <= 10^4"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    int largestRectangleArea(vector<int>& heights) {
        return 0;
    }
};`,
      python: `class Solution:
    def largestRectangleArea(self, heights: list[int]) -> int:
        return 0`,
      java: `public class Solution {
    public int largestRectangleArea(int[] heights) {
        return 0;
    }
}`,
      js: `class Solution {
    largestRectangleArea(heights) {
        return 0;
    }
}

module.exports = { Solution };`
    }
  },
  {
    title: "Sliding Window Maximum",
    slug: "sliding-window-maximum",
    difficulty: "Hard",
    tags: ["Array", "Queue", "Sliding Window", "Heap (Priority Queue)", "Monotonic Queue"],
    time_limit: 4000,
    statement: `You are given an array of integers \`nums\`, there is a sliding window of size \`k\` which is moving from the very left of the array to the very right. You can only see the \`k\` numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window.`,
    examples: [
      {
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "[3,3,5,5,6,7]",
        explanation: `Window position                Max
---------------               -----
[1  3  -1] -3  5  3  6  7       3
 1 [3  -1  -3] 5  3  6  7       3
 1  3 [-1  -3  5] 3  6  7       5
 1  3  -1 [-3  5  3] 6  7       5
 1  3  -1  -3 [5  3  6] 7       6
 1  3  -1  -3  5 [3  6  7]      7`
      },
      {
        input: "nums = [1], k = 1",
        output: "[1]",
        explanation: "Single element window."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
      "1 <= k <= nums.length"
    ],
    starterTemplates: {
      cpp: `class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        return {};
    }
};`,
      python: `class Solution:
    def maxSlidingWindow(self, nums: list[int], k: int) -> list[int]:
        return []`,
      java: `public class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        return new int[0];
    }
}`,
      js: `class Solution {
    maxSlidingWindow(nums, k) {
        return [];
    }
}

module.exports = { Solution };`
    }
  }
];

export const formatProblemDescription = (problem) => {
  const examplesMarkdown = problem.examples.map((ex, i) => `### Example ${i + 1}
**Input:** \`${ex.input}\`  
**Output:** \`${ex.output}\`  
${ex.explanation ? `**Explanation:** ${ex.explanation}` : ''}
`).join('\n');

  const constraintsMarkdown = problem.constraints.map((c) => `- ${c}`).join('\n');

  return `# ${problem.title}

**Difficulty:** ${problem.difficulty} | **Topics:** ${problem.tags.join(', ')}

## Description
${problem.statement}

## Examples
${examplesMarkdown}

## Constraints
${constraintsMarkdown}
`;
};
