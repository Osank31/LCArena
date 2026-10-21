import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { ProblemsPage } from "../../pages/ProblemsPage";
import { ProblemDetailPage } from "../../pages/ProblemDetailPage";
import { Navbar } from "../../components/common/Navbar";
import { AuthProvider } from "../../context/AuthContext";
import { apiClient, setStoredToken } from "../../services/apiClient";
import { authService } from "../../services/authService";
import { backendStatus } from "../../services/backendStatus";
import { problemService } from "../../services/problemService";
import { submissionService } from "../../services/submissionService";
import { APOLOGY_TITLE } from "../../components/common/DeveloperApologyBanner";
import { ParsedProblem } from "../../types/problem.types";

const remoteProblem = {
  _id: "66f1a0b2c3d4e5f60718293a",
  description:
    "## Description\nRead two integers and print their sum.\n\n### Example 1\n**Input:** `1 2`\n**Output:** `3`",
  difficulty: "Easy",
  sampleTestCaseUrl: "https://example.com/sample",
  testCasesUrl: "https://example.com/tests",
  time_limit: 2000,
  title: "Backend Sum",
  slug: "backend-sum",
  tags: ["Math"],
};

const parsedProblem: ParsedProblem = {
  id: "66f1a0b2c3d4e5f60718293a",
  title: "Backend Sum",
  slug: "backend-sum",
  difficulty: "Easy",
  timeLimit: 2000,
  tags: ["Math"],
  statement: "Read two integers and print their sum.",
  rawDescription: "Read two integers and print their sum.",
  starterTemplates: {},
  sampleTestCaseUrl: "https://example.com/sample",
  testCasesUrl: "https://example.com/tests",
  examples: [{ input: "1 2", output: "3" }],
  constraints: ["1 <= a, b <= 1000"],
};

describe("Online backend experience", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    backendStatus.markOnline();
  });

  const renderProblemPage = () =>
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/66f1a0b2c3d4e5f60718293a"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

  it("loads the live problem catalog from the backend and hides the apology banner", async () => {
    const getSpy = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce({ data: { success: true, data: [remoteProblem] } });

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Backend Sum")).toBeInTheDocument();
    expect(screen.queryByText(APOLOGY_TITLE)).not.toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith("/api/problems");
  });

  it("shows a Live indicator in the navbar instead of the demo mode button", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByText(/Demo Mode/i)).not.toBeInTheDocument();
  });

  it("previews sample cases on Run without the offline demo notice", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce(parsedProblem);

    renderProblemPage();

    expect(await screen.findAllByText("Backend Sum")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    expect(
      (await screen.findAllByText(/Sample Cases \(Preview Only\)/i)).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByText(/Live code execution is disabled in this hosted demo/i)
    ).not.toBeInTheDocument();
  });

  it("surfaces the real judge error on Submit instead of the apology modal", async () => {
    setStoredToken("valid_token_xyz");
    vi.spyOn(authService, "getProfile").mockResolvedValue({
      userId: "user_logged_in",
      email: "coder@example.com",
      name: "Competitive Coder",
      userRole: "Regular",
    });
    vi.spyOn(problemService, "getProblemById").mockResolvedValue(parsedProblem);

    const requestError = Object.assign(
      new Error("Request failed with status code 500"),
      {
        isAxiosError: true,
        response: { status: 500, data: { message: "Judge unavailable" } },
      }
    );
    vi.spyOn(submissionService, "createSubmission").mockRejectedValueOnce(requestError);

    renderProblemPage();

    expect(await screen.findAllByText("Backend Sum")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect((await screen.findAllByText(/Judge unavailable/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Submission Failed").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByText(/Code Execution Unavailable in Online Demo/i)
    ).not.toBeInTheDocument();
  });
});
