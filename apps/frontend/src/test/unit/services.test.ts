import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../../services/authService";
import { problemService } from "../../services/problemService";
import { submissionService } from "../../services/submissionService";
import { apiClient, getStoredToken, setStoredToken } from "../../services/apiClient";
import { IProblem } from "../../types/problem.types";
import { ISubmission } from "../../types/submission.types";

vi.mock("../../services/apiClient", async () => {
  const actual = await vi.importActual("../../services/apiClient");
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("sendOtp sends email to /auth/send-otp", async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true } });
    await authService.sendOtp("test@example.com");
    expect(apiClient.post).toHaveBeenCalledWith("/auth/send-otp", {
      email: "test@example.com",
    });
  });

  it("login authenticates user and sets access token", async () => {
    const mockUser = {
      userId: "u123",
      email: "test@example.com",
      name: "Tester",
      userRole: "Regular" as const,
    };
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser, accessToken: "token_123" },
      },
    });

    const res = await authService.login({
      email: "test@example.com",
      password: "password123",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "password123",
    });
    expect(res.user.email).toBe("test@example.com");
    expect(getStoredToken()).toBe("token_123");
  });

  it("loginWithOtp authenticates with OTP and sets access token", async () => {
    const mockUser = {
      userId: "u123",
      email: "test@example.com",
      name: "Tester",
      userRole: "Regular" as const,
    };
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser, accessToken: "otp_token_abc" },
      },
    });

    const res = await authService.loginWithOtp({
      email: "test@example.com",
      otp: "123456",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login-otp", {
      email: "test@example.com",
      otp: "123456",
    });
    expect(res.user.name).toBe("Tester");
    expect(getStoredToken()).toBe("otp_token_abc");
  });

  it("register registers user and stores access token", async () => {
    const mockUser = {
      userId: "u456",
      email: "new@example.com",
      name: "New User",
      userRole: "Regular" as const,
    };
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: mockUser, accessToken: "reg_token_xyz" },
      },
    });

    const res = await authService.register({
      name: "New User",
      email: "new@example.com",
      password: "securepassword",
      otp: "654321",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      name: "New User",
      email: "new@example.com",
      password: "securepassword",
      otp: "654321",
    });
    expect(res.user.name).toBe("New User");
    expect(getStoredToken()).toBe("reg_token_xyz");
  });

  it("getProfile fetches user profile from /auth/me", async () => {
    const mockUser = {
      userId: "u123",
      email: "test@example.com",
      name: "Tester",
      userRole: "Regular" as const,
    };
    (apiClient.get as any).mockResolvedValueOnce({
      data: { success: true, data: mockUser },
    });

    const profile = await authService.getProfile();
    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
    expect(profile.userId).toBe("u123");
  });

  it("logout posts to /auth/logout and clears tokens", async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true } });
    await authService.logout();
    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout", {});
    expect(getStoredToken()).toBeNull();
  });

  it("changePassword sends new password", async () => {
    (apiClient.post as any).mockResolvedValueOnce({ data: { success: true } });
    await authService.changePassword({
      currentPassword: "old",
      newPassword: "newPass123",
    });
    expect(apiClient.post).toHaveBeenCalledWith("/auth/change-password", {
      currentPassword: "old",
      newPassword: "newPass123",
    });
  });

  it("deleteAccount deletes account and clears storage", async () => {
    (apiClient.delete as any).mockResolvedValueOnce({ data: { success: true } });
    await authService.deleteAccount("confirm_pw");
    expect(apiClient.delete).toHaveBeenCalledWith("/auth/account", {
      data: { password: "confirm_pw" },
    });
    expect(getStoredToken()).toBeNull();
  });
});

describe("problemService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProblem: IProblem = {
    _id: "p1",
    title: "Sum Problem",
    description: "Read two numbers and print sum.",
    difficulty: "Easy",
    sampleTestCaseUrl: "sample.txt",
    testCasesUrl: "testcases.zip",
    time_limit: 2000,
  };

  it("getAllProblems fetches and parses problems", async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: { success: true, data: [mockProblem] },
    });

    const problems = await problemService.getAllProblems();
    expect(apiClient.get).toHaveBeenCalledWith("/api/problems");
    expect(problems).toHaveLength(1);
    expect(problems[0].id).toBe("p1");
    expect(problems[0].title).toBe("Sum Problem");
  });

  it("getProblemById fetches single problem", async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: { success: true, data: mockProblem },
    });

    const problem = await problemService.getProblemById("p1");
    expect(apiClient.get).toHaveBeenCalledWith("/api/problems/p1");
    expect(problem.id).toBe("p1");
    expect(problem.difficulty).toBe("Easy");
  });

  it("getProblemById throws if data is missing", async () => {
    (apiClient.get as any).mockResolvedValueOnce({
      data: { success: true, data: null },
    });

    await expect(problemService.getProblemById("p1")).rejects.toThrow("Problem not found");
  });
});

describe("submissionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const sampleSubmission: ISubmission = {
    _id: "sub_99",
    problemId: "prob_1",
    userId: "user_1",
    code: "int main() { return 0; }",
    language: "cpp",
    status: { status: "PENDING" },
    createdAt: "2026-10-11T12:00:00Z",
    updatedAt: "2026-10-11T12:00:00Z",
  };

  it("createSubmission posts code and records locally", async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: { success: true, data: sampleSubmission },
    });

    const sub = await submissionService.createSubmission({
      problemId: "prob_1",
      code: "int main() { return 0; }",
      language: "cpp",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/api/submissions", {
      problemId: "prob_1",
      code: "int main() { return 0; }",
      language: "cpp",
    });
    expect(sub._id).toBe("sub_99");

    const localList = submissionService.getLocalSubmissions("user_1");
    expect(localList).toHaveLength(1);
    expect(localList[0]._id).toBe("sub_99");
  });

  it("pollVerdict polls until verdict is SUCCESS", async () => {
    const pendingSub = { ...sampleSubmission, status: { status: "PENDING" as const } };
    const finishedSub = {
      ...sampleSubmission,
      status: {
        status: "SUCCESS" as const,
        passed: 10,
        total: 10,
        failedCases: { tle: [], re: [], wa: [] },
        executionTimeMs: { tc_1: 5 },
      },
    };

    (apiClient.get as any)
      .mockResolvedValueOnce({ data: { success: true, data: pendingSub } })
      .mockResolvedValueOnce({ data: { success: true, data: finishedSub } });

    const progressUpdates: any[] = [];
    const result = await submissionService.pollVerdict(
      "sub_99",
      (update) => progressUpdates.push(update),
      5,
      50 // fast 50ms interval for tests
    );

    expect(result.status.status).toBe("SUCCESS");
    expect(progressUpdates.length).toBe(2);
  });

  it("filters submissions by problemId", () => {
    submissionService.recordLocalSubmission({
      ...sampleSubmission,
      _id: "sub_1",
      problemId: "prob_A",
    });
    submissionService.recordLocalSubmission({
      ...sampleSubmission,
      _id: "sub_2",
      problemId: "prob_B",
    });

    const forA = submissionService.getProblemSubmissions("prob_A", "user_1");
    expect(forA).toHaveLength(1);
    expect(forA[0]._id).toBe("sub_1");
  });

  it("resolves effective userId from stored token when userId is not provided", () => {
    // Fake JWT with userId "u_token_123" in payload
    const fakePayload = btoa(JSON.stringify({ userId: "u_token_123" }));
    setStoredToken(`header.${fakePayload}.sig`);

    submissionService.recordLocalSubmission({
      ...sampleSubmission,
      _id: "sub_token_test",
      problemId: "prob_A",
      userId: "",
    });

    const submissions = submissionService.getProblemSubmissions("prob_A");
    expect(submissions).toHaveLength(1);
    expect(submissions[0]._id).toBe("sub_token_test");
    expect(submissions[0].userId).toBe("u_token_123");
  });

  it("merges anonymous submissions into user submissions once authenticated", () => {
    submissionService.recordLocalSubmission({
      ...sampleSubmission,
      _id: "sub_anon_1",
      problemId: "prob_A",
      userId: "anonymous",
    });

    const userSubs = submissionService.getLocalSubmissions("user_authenticated");
    expect(userSubs.some((s) => s._id === "sub_anon_1")).toBe(true);
  });
});
