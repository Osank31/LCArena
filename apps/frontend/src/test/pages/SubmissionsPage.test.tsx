import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { SubmissionsPage } from "../../pages/SubmissionsPage";
import { AuthProvider } from "../../context/AuthContext";
import { submissionService } from "../../services/submissionService";
import { problemService } from "../../services/problemService";
import { ISubmission } from "../../types/submission.types";

const mockSubmissions: ISubmission[] = [
  {
    _id: "sub_list_1",
    problemId: "prob_1",
    userId: "u1",
    code: "#include <iostream>\nint main() { return 0; }",
    language: "cpp",
    status: {
      status: "SUCCESS",
      passed: 15,
      total: 15,
      executionTimeMs: { tc_1: 8 },
      failedCases: { tle: [], re: [], wa: [] },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "sub_list_2",
    problemId: "prob_2",
    userId: "u1",
    code: "def solve():\n    return False",
    language: "py",
    status: {
      status: "SUCCESS",
      passed: 5,
      total: 10,
      executionTimeMs: { tc_1: 45 },
      failedCases: { tle: [], re: [], wa: ["tc_6"] },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("SubmissionsPage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders empty state when user has no local submissions", () => {
    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValue([]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <SubmissionsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Submission History")).toBeInTheDocument();
    expect(screen.getByText("No submissions found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse problems/i })).toBeInTheDocument();
  });

  it("renders table with submissions and status badges", async () => {
    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValue(mockSubmissions);
    vi.spyOn(problemService, "getAllProblems").mockResolvedValue([
      {
        id: "prob_1",
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "Easy",
        timeLimit: 5000,
        tags: ["Array"],
        statement: "Two sum problem",
        rawDescription: "Two sum problem",
        starterTemplates: {},
        sampleTestCaseUrl: "https://example.com/s",
        testCasesUrl: "https://example.com/t",
        examples: [],
        constraints: [],
      },
    ]);

    render(
      <AuthProvider>
        <BrowserRouter>
          <SubmissionsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Submission History")).toBeInTheDocument();
    expect(screen.getAllByText("Accepted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Wrong Answer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("cpp")).toBeInTheDocument();
    expect(screen.getByText("py")).toBeInTheDocument();
  });

  it("filters submissions by status and language", async () => {
    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValue(mockSubmissions);

    render(
      <AuthProvider>
        <BrowserRouter>
          <SubmissionsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const statusFilter = screen.getByLabelText(/filter by verdict status/i);
    fireEvent.change(statusFilter, { target: { value: "Accepted" } });

    expect(screen.getAllByText("Accepted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Wrong Answer")).toHaveLength(1); // only in select dropdown

    const langFilter = screen.getByLabelText(/filter by language/i);
    fireEvent.change(langFilter, { target: { value: "py" } });

    // Now no accepted Python submissions exist
    expect(screen.getByText("No submissions found")).toBeInTheDocument();

    // Reset button
    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);

    expect(screen.getAllByText("Accepted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Wrong Answer").length).toBeGreaterThanOrEqual(1);
  });

  it("opens modal and displays submitted code when View is clicked", async () => {
    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValue(mockSubmissions);

    render(
      <AuthProvider>
        <BrowserRouter>
          <SubmissionsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText(/submitted source code:/i)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("#include <iostream>"))
    ).toBeInTheDocument();
  });
});
