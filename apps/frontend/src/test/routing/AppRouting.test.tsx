import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import App, { AppLayout } from "../../App";
import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { problemService } from "../../services/problemService";
import { setStoredToken } from "../../services/apiClient";

describe("App Routing and Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderRoute = (initialPath: string) => {
    return render(
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <AppLayout />
        </MemoryRouter>
      </AuthProvider>
    );
  };

  it("redirects the root path '/' to the problems catalog", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce([]);

    renderRoute("/");
    // The problems catalog is now the landing page.
    expect(await screen.findByText("Problems Catalog")).toBeInTheDocument();
    // Footer is rendered on non-workspace routes
    expect(screen.getByText(/sandboxed online judge/i)).toBeInTheDocument();
  });

  it("renders ProblemsPage at '/problems'", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce([]);

    renderRoute("/problems");
    expect(await screen.findByText("Problems Catalog")).toBeInTheDocument();
    expect(screen.getByText(/sandboxed online judge/i)).toBeInTheDocument();
  });

  it("renders LoginPage at '/login'", async () => {
    renderRoute("/login");
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("renders RegisterPage at '/register'", async () => {
    renderRoute("/register");
    expect(screen.getByText("Create an Account")).toBeInTheDocument();
  });

  it("renders SubmissionsPage at '/submissions'", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce([]);

    renderRoute("/submissions");
    expect(await screen.findByText("Submission History")).toBeInTheDocument();
  });

  it("redirects unauthenticated user accessing '/profile' to LoginPage", async () => {
    renderRoute("/profile");
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  });

  it("renders ProfilePage at '/profile' when user is authenticated", async () => {
    setStoredToken("token_mock");
    vi.spyOn(authService, "getProfile").mockResolvedValueOnce({
      userId: "auth_u1",
      email: "authed@example.com",
      name: "Authed User",
      userRole: "Regular",
    });
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce([]);

    renderRoute("/profile");
    expect(await screen.findAllByText("Authed User")).toHaveLength(2);
    expect(screen.getByText("Security & Account Settings")).toBeInTheDocument();
  });

  it("renders NotFoundPage when navigating to an unknown path", () => {
    renderRoute("/some-unknown-route-that-does-not-exist");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
  });

  it("omits footer when on workspace route '/problems/:id'", async () => {
    vi.spyOn(problemService, "getProblemById").mockResolvedValueOnce({
      id: "prob_abc",
      title: "Workspace Problem",
      slug: "workspace-problem",
      difficulty: "Easy",
      timeLimit: 5000,
      tags: ["Array"],
      statement: "Sample description",
      rawDescription: "Sample description",
      starterTemplates: {},
      sampleTestCaseUrl: "https://example.com/s",
      testCasesUrl: "https://example.com/t",
      examples: [],
      constraints: [],
    });

    renderRoute("/problems/prob_abc");
    expect(await screen.findAllByText("Workspace Problem")).toHaveLength(2);
    // Verify footer is omitted on workspace
    expect(screen.queryByText(/sandboxed online judge/i)).not.toBeInTheDocument();
  });

  it("renders full root App component and lands on the problems catalog", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValueOnce([]);
    render(<App />);
    expect(await screen.findByText("Problems Catalog")).toBeInTheDocument();
  });
});
