import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceHeader } from "../../components/problem/WorkspaceHeader";
import { ProblemDescription } from "../../components/problem/ProblemDescription";
import { OutputConsole } from "../../components/problem/OutputConsole";
import { SubmissionHistoryTab } from "../../components/problem/SubmissionHistoryTab";
import { CodeEditorPane } from "../../components/problem/CodeEditorPane";
import { ParsedProblem } from "../../types/problem.types";
import { ISubmission } from "../../types/submission.types";

const mockProblem: ParsedProblem = {
  id: "p123",
  title: "Valid Parentheses",
  slug: "valid-parentheses",
  difficulty: "Easy",
  tags: ["Stack", "String"],
  timeLimit: 2000,
  statement: "Given string s containing parentheses, determine validity.",
  examples: [
    {
      input: 's = "()"',
      output: "true",
      explanation: "Parentheses match perfectly.",
    },
  ],
  constraints: ["1 <= s.length <= 10^4"],
  starterTemplates: {},
  sampleTestCaseUrl: "sample.txt",
  testCasesUrl: "testcases.zip",
  rawDescription: "desc",
};

describe("WorkspaceHeader component", () => {
  it("renders problem title, language select and actions", () => {
    const handleRun = vi.fn();
    const handleSubmit = vi.fn();
    const handleReset = vi.fn();
    const handleLangChange = vi.fn();

    render(
      <BrowserRouter>
        <WorkspaceHeader
          problem={mockProblem}
          selectedLanguage="cpp"
          onLanguageChange={handleLangChange}
          onRun={handleRun}
          onSubmit={handleSubmit}
          onReset={handleReset}
          isEvaluating={false}
          aiEnabled={false}
          onToggleAi={() => {}}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("Valid Parentheses")).toBeInTheDocument();

    // Language selection
    const langSelect = screen.getByLabelText(/select programming language/i);
    fireEvent.change(langSelect, { target: { value: "py" } });
    expect(handleLangChange).toHaveBeenCalledWith("py");

    // Run & Submit buttons
    fireEvent.click(screen.getByText("Run"));
    expect(handleRun).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Submit"));
    expect(handleSubmit).toHaveBeenCalledTimes(1);

    // Reset button
    fireEvent.click(screen.getByLabelText(/reset code template/i));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});

describe("ProblemDescription component", () => {
  it("renders problem statement, examples, and constraints", () => {
    render(<ProblemDescription problem={mockProblem} />);

    expect(screen.getByText("Valid Parentheses")).toBeInTheDocument();
    expect(screen.getByText("2000ms")).toBeInTheDocument();
    expect(screen.getByText("Stack")).toBeInTheDocument();
    expect(screen.getByText(/Given string s containing parentheses/)).toBeInTheDocument();
    expect(screen.getByText('s = "()"')).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("Parentheses match perfectly.")).toBeInTheDocument();
    expect(screen.getByText("1 <= s.length <= 10^4")).toBeInTheDocument();
  });
});

describe("OutputConsole component", () => {
  it("renders execution evaluation spinner when isEvaluating is true", () => {
    render(
      <OutputConsole
        problem={mockProblem}
        isEvaluating={true}
        result={null}
      />
    );

    expect(screen.getByText(/running evaluation/i)).toBeInTheDocument();
  });

  it("renders Accepted verdict with time and passed counter", () => {
    render(
      <OutputConsole
        problem={mockProblem}
        isEvaluating={false}
        result={{
          status: "SUCCESS",
          passed: 40,
          total: 40,
          failedCases: { tle: [], re: [], wa: [] },
          executionTimeMs: { tc_01: 25 },
        }}
      />
    );

    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("40 / 40")).toBeInTheDocument();
    expect(screen.getByText("25 ms")).toBeInTheDocument();
  });

  it("renders Compilation Error with diagnostic log", () => {
    render(
      <OutputConsole
        problem={mockProblem}
        isEvaluating={false}
        result={{
          status: "COMPILE_ERROR",
          compileError: "error: syntax error near unexpected token",
        }}
      />
    );

    expect(screen.getByText("Compilation Error")).toBeInTheDocument();
    expect(screen.getByText(/syntax error near unexpected token/)).toBeInTheDocument();
  });

  it("renders sample test case when Sample Testcase tab is clicked", () => {
    render(
      <OutputConsole
        problem={mockProblem}
        isEvaluating={false}
        result={null}
      />
    );

    fireEvent.click(screen.getByText("Sample Testcase"));
    expect(screen.getByText('s = "()"')).toBeInTheDocument();
  });
});

describe("SubmissionHistoryTab component", () => {
  const sampleSubs: ISubmission[] = [
    {
      _id: "sub_1",
      problemId: "p123",
      userId: "u1",
      code: "class Solution { ... }",
      language: "cpp",
      status: {
        status: "SUCCESS",
        passed: 40,
        total: 40,
        failedCases: { tle: [], re: [], wa: [] },
        executionTimeMs: { tc_1: 15 },
      },
      createdAt: "2026-10-11T12:00:00Z",
      updatedAt: "2026-10-11T12:00:00Z",
    },
  ];

  it("renders empty state when no submissions exist", () => {
    render(<SubmissionHistoryTab submissions={[]} isLoading={false} />);
    expect(screen.getByText("No submissions yet")).toBeInTheDocument();
  });

  it("renders submission item and opens inspect modal on click", () => {
    render(<SubmissionHistoryTab submissions={sampleSubs} isLoading={false} />);

    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("cpp")).toBeInTheDocument();
    expect(screen.getByText("15ms")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Inspect"));
    expect(screen.getByText("Submission Details (CPP)")).toBeInTheDocument();
    expect(screen.getByText("class Solution { ... }")).toBeInTheDocument();
  });
});

describe("CodeEditorPane component", () => {
  it("renders code editor container and textarea fallback", () => {
    const handleChange = vi.fn();

    render(
      <CodeEditorPane
        value="const x = 10;"
        onChange={handleChange}
        language="js"
        aiEnabled={true}
      />
    );

    expect(screen.getByTestId("code-editor-container")).toBeInTheDocument();
    const textarea = screen.getByTestId("code-editor-textarea");
    expect(textarea).toHaveValue("const x = 10;");

    fireEvent.change(textarea, { target: { value: "const x = 20;" } });
    expect(handleChange).toHaveBeenCalledWith("const x = 20;");
  });

  it("handles different languages cleanly", () => {
    const handleChange = vi.fn();

    const { rerender } = render(
      <CodeEditorPane
        value="# Python"
        onChange={handleChange}
        language="py"
      />
    );
    expect(screen.getByTestId("code-editor-textarea")).toHaveValue("# Python");

    rerender(
      <CodeEditorPane
        value="// Java"
        onChange={handleChange}
        language="java"
      />
    );
    expect(screen.getByTestId("code-editor-textarea")).toHaveValue("// Java");
  });
});
