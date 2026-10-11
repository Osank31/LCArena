import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ProfilePage } from "../../pages/ProfilePage";
import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { problemService } from "../../services/problemService";
import { submissionService } from "../../services/submissionService";
import { setStoredToken } from "../../services/apiClient";

const mockUser = {
  userId: "u_profile_1",
  email: "profile.user@example.com",
  name: "Profile User",
  userRole: "Regular" as const,
  createdAt: "2026-01-15T00:00:00.000Z",
};

describe("ProfilePage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const setupAuthenticatedUser = () => {
    setStoredToken("mock_jwt_profile");
    vi.spyOn(authService, "getProfile").mockResolvedValue(mockUser);
  };

  it("renders profile metadata, stats, and difficulty bars", async () => {
    setupAuthenticatedUser();

    vi.spyOn(submissionService, "getLocalSubmissions").mockReturnValue([
      {
        _id: "sub_prof_1",
        problemId: "prob_1",
        userId: mockUser.userId,
        code: "int main() {}",
        language: "cpp",
        status: {
          status: "SUCCESS",
          passed: 10,
          total: 10,
          executionTimeMs: { tc_1: 15 },
          failedCases: { tle: [], re: [], wa: [] },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    vi.spyOn(problemService, "getAllProblems").mockResolvedValue([
      {
        id: "prob_1",
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "Easy",
        timeLimit: 5000,
        tags: ["Array"],
        statement: "Two Sum description",
        rawDescription: "Two Sum description",
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
          <ProfilePage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Profile User")).toBeInTheDocument();
    expect(screen.getByText("profile.user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();

    // Stats
    expect(screen.getByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("Submissions")).toBeInTheDocument();
    expect(screen.getByText("Acceptance")).toBeInTheDocument();

    // Recent submissions
    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("handles password change validation and successful submission", async () => {
    setupAuthenticatedUser();
    vi.spyOn(authService, "changePassword").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Profile User")).toBeInTheDocument();

    const currentPwdInput = screen.getByLabelText(/current password/i);
    const newPwdInput = screen.getByLabelText(/new password/i);
    const updateBtn = screen.getByRole("button", { name: /update password/i });
    const form = updateBtn.closest("form")!;

    // Empty fields check
    fireEvent.submit(form);
    expect(
      await screen.findByText(/please fill out both password fields/i)
    ).toBeInTheDocument();

    // Short password
    fireEvent.change(currentPwdInput, { target: { value: "oldsecret" } });
    fireEvent.change(newPwdInput, { target: { value: "123" } });
    fireEvent.submit(form);
    expect(
      await screen.findByText(/new password must be at least 6 characters/i)
    ).toBeInTheDocument();

    // Valid update
    fireEvent.change(newPwdInput, { target: { value: "newsecret123" } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith({
        currentPassword: "oldsecret",
        newPassword: "newsecret123",
      });
      expect(screen.getByText(/password changed successfully!/i)).toBeInTheDocument();
    });
  });

  it("handles account deletion modal and cancellation", async () => {
    setupAuthenticatedUser();

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Profile User")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText("Confirm Account Deletion")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Confirm Account Deletion")).not.toBeInTheDocument();
    });
  });

  it("executes account deletion when confirmed", async () => {
    setupAuthenticatedUser();
    vi.spyOn(authService, "deleteAccount").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Profile User")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete account/i });
    fireEvent.click(deleteBtn);

    const confirmPwdInput = screen.getByPlaceholderText(/enter password to confirm/i);
    fireEvent.change(confirmPwdInput, { target: { value: "mypassword" } });

    const confirmDeleteBtn = screen.getByRole("button", {
      name: /permanently delete/i,
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(authService.deleteAccount).toHaveBeenCalledWith("mypassword");
    });
  });
});
