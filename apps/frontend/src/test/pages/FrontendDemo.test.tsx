import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { ProblemsPage } from "../../pages/ProblemsPage";
import { ProblemDetailPage } from "../../pages/ProblemDetailPage";
import { AuthProvider } from "../../context/AuthContext";
import { apiClient } from "../../services/apiClient";
import { GITHUB_REPO_URL, APOLOGY_TITLE } from "../../components/common/DeveloperApologyBanner";

describe("Frontend Demo Mode (Backend Offline Experience)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders developer apology banner and all 4 sample problems without any backend calls", async () => {
    const apiSpy = vi.spyOn(apiClient, "get");

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProblemsPage />
        </BrowserRouter>
      </AuthProvider>
    );

    // 1. Verify developer apology banner
    expect(screen.getByText(APOLOGY_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(/sorry, i haven't deployed the backend yet!/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/running the code execution servers and supporting infrastructure gets pretty expensive/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /gitHub repository/i })
    ).toHaveAttribute("href", GITHUB_REPO_URL);

    // 2. Verify all four sample problems are rendered
    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Reverse a String")).toBeInTheDocument();
    expect(screen.getByText("Valid Parentheses")).toBeInTheDocument();
    expect(screen.getByText("Maximum Subarray Sum")).toBeInTheDocument();

    // 3. Verify difficulty counts: 3 Easy, 1 Medium
    expect(screen.getByText("4")).toBeInTheDocument(); // 4 total problems
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 Easy
    expect(screen.getByText("1")).toBeInTheDocument(); // 1 Medium

    // 4. Verify no backend API requests were made
    expect(apiSpy).not.toHaveBeenCalled();
  });

  it("opens Two Sum problem details and shows statement, examples, and constraints without backend", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/two-sum"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Two Sum")).toHaveLength(2);
    expect(screen.getByText(/given an array of integers/i)).toBeInTheDocument();
    expect(screen.getByText("nums = [2,7,11,15], target = 9")).toBeInTheDocument();
    expect(screen.getAllByText("[0,1]").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Only one valid answer exists.")).toBeInTheDocument();
  });

  it("opens Reverse a String problem and displays its content", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/reverse-a-string"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Reverse a String")).toHaveLength(2);
    expect(screen.getByText(/write a function that reverses a given string/i)).toBeInTheDocument();
    expect(screen.getByText('s = "hello"')).toBeInTheDocument();
    expect(screen.getByText('"olleh"')).toBeInTheDocument();
  });

  it("opens Valid Parentheses problem and displays its content", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/valid-parentheses"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Valid Parentheses")).toHaveLength(2);
    expect(screen.getByText(/given a string `s` containing just the characters/i)).toBeInTheDocument();
    expect(screen.getByText('s = "()[]{}"')).toBeInTheDocument();
  });

  it("opens Maximum Subarray Sum problem and displays its content", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/maximum-subarray-sum"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Maximum Subarray Sum")).toHaveLength(2);
    expect(screen.getByText(/find the contiguous subarray/i)).toBeInTheDocument();
    expect(screen.getByText("nums = [-2,1,-3,4,-1,2,1,-5,4]")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("clicking Run shows demo notice and sample reference data without faking execution", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/two-sum"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Two Sum")).toHaveLength(2);

    const runBtn = screen.getByRole("button", { name: /run/i });
    fireEvent.click(runBtn);

    // Verdict area displays notice explaining execution is unavailable in online demo
    expect(
      (
        await screen.findAllByText(
          /Notice: Execution Unavailable in Online Demo/i,
          {},
          { timeout: 3000 }
        )
      ).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      (
        await screen.findAllByText(
          /Live code execution is disabled in this hosted demo/i,
          {},
          { timeout: 3000 }
        )
      ).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      (
        await screen.findAllByText(
          /Tested against sample input/i,
          {},
          { timeout: 3000 }
        )
      ).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      (
        await screen.findAllByText(
          /No code was executed on a server/i,
          {},
          { timeout: 3000 }
        )
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("clicking Submit displays friendly notice that judging requires locally running backend", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/problems/two-sum"]}>
          <Routes>
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findAllByText("Two Sum")).toHaveLength(2);

    const submitBtn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submitBtn);

    // Modal pops up explaining submission requirement and offline demo mode
    expect(
      await screen.findByText(/Sign In to Submit Solutions/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/in this free online demo, backend execution servers are not hosted/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run LCArena locally with Docker Compose to evaluate submissions/i)
    ).toBeInTheDocument();
  });
});
