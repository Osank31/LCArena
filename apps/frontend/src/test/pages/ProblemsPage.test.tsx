import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ProblemsPage } from "../../pages/ProblemsPage";
import { AuthProvider } from "../../context/AuthContext";
import { problemService } from "../../services/problemService";
import { submissionService } from "../../services/submissionService";
import { ParsedProblem } from "../../types/problem.types";

const mockProblems: ParsedProblem[] = [
  {
    id: "prob_1",
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    timeLimit: 5000,
    tags: ["Array", "Hash Table"],
    statement: "Given an array of integers nums and an integer target...",
    rawDescription: "Given an array of integers nums and an integer target...",
    starterTemplates: {},
    sampleTestCaseUrl: "https://example.com/s",
    testCasesUrl: "https://example.com/t",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
    constraints: ["2 <= nums.length <= 10^4"],
  },
  {
    id: "prob_2",
    title: "Add Two Numbers",
    slug: "add-two-numbers",
    difficulty: "Medium",
    timeLimit: 5000,
    tags: ["Linked List", "Math"],
    statement: "You are given two non-empty linked lists...",
    rawDescription: "You are given two non-empty linked lists...",
    starterTemplates: {},
    sampleTestCaseUrl: "https://example.com/s",
    testCasesUrl: "https://example.com/t",
    examples: [{ input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]" }],
    constraints: ["0 <= Node.val <= 9"],
  },
  {
    id: "prob_3",
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    timeLimit: 6000,
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    statement: "Given two sorted arrays nums1 and nums2...",
    rawDescription: "Given two sorted arrays nums1 and nums2...",
    starterTemplates: {},
    sampleTestCaseUrl: "https://example.com/s",
    testCasesUrl: "https://example.com/t",
    examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.00000" }],
    constraints: ["0 <= m <= 1000"],
  },
];

describe("ProblemsPage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders problem list and summary counters after successful fetch", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce(mockProblems);

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Initial skeleton check
    expect(screen.getByText("Problems Catalog")).toBeInTheDocument();

    // After data loads
    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Add Two Numbers")).toBeInTheDocument();
    expect(screen.getByText("Median of Two Sorted Arrays")).toBeInTheDocument();

    // Summary counts
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("Easy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Med").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Hard").length).toBeGreaterThanOrEqual(1);
  });

  it("indicates solved status when user has an accepted submission", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce(mockProblems);
    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValueOnce([
      {
        _id: "sub_1",
        problemId: "prob_1",
        userId: "user_test",
        code: "int main() {}",
        language: "cpp",
        status: {
          status: "SUCCESS",
          passed: 10,
          total: 10,
          executionTimeMs: {},
          failedCases: { tle: [], re: [], wa: [] },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Solved")).toBeInTheDocument();
  });

  it("filters problems by search term", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce(mockProblems);

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "Median" } });

    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.queryByText("Add Two Numbers")).not.toBeInTheDocument();
    expect(screen.getByText("Median of Two Sorted Arrays")).toBeInTheDocument();
  });

  it("filters problems by difficulty", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce(mockProblems);

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();

    const hardBtn = screen.getByRole("button", { name: /^hard$/i });
    fireEvent.click(hardBtn);

    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.getByText("Median of Two Sorted Arrays")).toBeInTheDocument();
  });

  it("displays empty state and resets filters when no match found", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce(mockProblems);

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentProblem999" } });

    expect(screen.getByText("No problems found")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /reset all filters/i });
    fireEvent.click(resetBtn);

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
  });

  it("handles fetch error and displays error alert", async () => {
    vi.spyOn(problemService, "getAllProblems").mockRejectedValueOnce(
      new Error("Database connection timed out")
    );

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(
      await screen.findByText(/database connection timed out/i)
    ).toBeInTheDocument();
  });
});
