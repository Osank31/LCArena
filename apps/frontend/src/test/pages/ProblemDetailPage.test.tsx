import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProblemDetailPage } from "../../pages/ProblemDetailPage";
import { AuthProvider } from "../../context/AuthContext";
import { problemService } from "../../services/problemService";
import { submissionService } from "../../services/submissionService";
import { authService } from "../../services/authService";
import { setStoredToken } from "../../services/apiClient";
import { ParsedProblem } from "../../types/problem.types";

const mockProblem: ParsedProblem = {
  id: "prob_detail_1",
  title: "Longest Palindromic Substring",
  slug: "longest-palindromic-substring",
  difficulty: "Medium",
  timeLimit: 5000,
  tags: ["String", "Dynamic Programming"],
  statement: "Given a string s, return the longest palindromic substring in s.",
  rawDescription: "Given a string s, return the longest palindromic substring in s.",
  starterTemplates: {},
  sampleTestCaseUrl: "https://example.com/sample",
  testCasesUrl: "https://example.com/tests",
  examples: [
    {
      input: 's = "babad"',
      output: '"bab"',
      explanation: '"aba" is also a valid answer.',
    },
  ],
  constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters."],
};

describe("ProblemDetailPage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderWithRouter = (problemId = "prob_detail_1") => {
    return render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/problems/${problemId}`]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
  };

  it("loads and renders problem description, examples, and editor pane", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(mockProblem);

    renderWithRouter();

    // Verify problem header and title
    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);
    expect(screen.getAllByText("Medium").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/given a string s, return the longest palindromic substring in s/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/s = "babad"/i)).toBeInTheDocument();
    expect(screen.getByText(/1 <= s.length <= 1000/i)).toBeInTheDocument();
  });

  it("displays error banner when problem fails to load", async () => {
    vi.spyOn(problemService, "getProblemById").mockRejectedValueOnce(
      new Error("Problem not found in catalog")
    );

    renderWithRouter("invalid_id");

    expect(await screen.findByText("Problem Not Found")).toBeInTheDocument();
    expect(screen.getByText("Problem not found in catalog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to problems catalog/i })).toBeInTheDocument();
  });

  it("allows switching language and updating editor code", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(mockProblem);

    renderWithRouter();

    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);

    const langSelect = screen.getByLabelText(/select programming language/i);
    expect(langSelect).toHaveValue("cpp");

    fireEvent.change(langSelect, { target: { value: "py" } });
    expect(langSelect).toHaveValue("py");
  });

  it("opens reset confirmation modal and restores template on confirm", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(mockProblem);

    renderWithRouter();

    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);

    const resetBtn = screen.getByRole("button", { name: /reset code/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText("Reset Code Template?")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: /^reset code$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Reset Code Template?")).not.toBeInTheDocument();
    });
  });

  it("handles Run button click against sample cases", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(mockProblem);

    renderWithRouter();

    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);

    const runBtn = screen.getByRole("button", { name: /run/i });
    fireEvent.click(runBtn);

    // After evaluation finishes
    expect(
      (await screen.findAllByText(/tested against sample input/i, {}, { timeout: 3000 })).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("prompts sign-in modal when unauthenticated user clicks Submit", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(mockProblem);

    renderWithRouter();

    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Sign In to Submit Solutions")).toBeInTheDocument();
  });

  it("submits code and polls verdict when authenticated", async () => {
    setStoredToken("valid_token_xyz");
    vi.spyOn(authService, "getProfile").mockResolvedValue({
      userId: "user_logged_in",
      email: "coder@example.com",
      name: "Competitive Coder",
      userRole: "Regular",
    });

    vi.spyOn(problemService, "getProblemById").mockResolvedValue(mockProblem);

    vi.spyOn(submissionService, "createSubmission").mockResolvedValueOnce({
      _id: "sub_new_99",
      problemId: "prob_detail_1",
      userId: "user_logged_in",
      code: "class Solution {};",
      language: "cpp",
      status: { status: "PENDING" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    vi.spyOn(submissionService, "pollVerdict").mockResolvedValueOnce({
      _id: "sub_new_99",
      problemId: "prob_detail_1",
      userId: "user_logged_in",
      code: "class Solution {};",
      language: "cpp",
      status: {
        status: "SUCCESS",
        passed: 25,
        total: 25,
        executionTimeMs: { tc_0: 12 },
        failedCases: { tle: [], re: [], wa: [] },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithRouter();

    expect(await screen.findAllByText("Longest Palindromic Substring")).toHaveLength(2);

    // Authenticated state is set via authService session
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submissionService.createSubmission).toHaveBeenCalledWith({
        problemId: "prob_detail_1",
        code: expect.any(String),
        language: "cpp",
      });
      expect(submissionService.pollVerdict).toHaveBeenCalledWith(
        "sub_new_99",
        expect.any(Function)
      );
    });
  });
});
