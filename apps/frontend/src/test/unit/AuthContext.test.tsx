import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { setStoredToken, getStoredToken } from "../../services/apiClient";

const TestAuthConsumer: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithOtp,
    register,
    sendOtp,
    logout,
    refreshUser,
    clearError,
  } = useAuth();

  return (
    <div>
      <div data-testid="is-loading">{String(isLoading)}</div>
      <div data-testid="is-authed">{String(isAuthenticated)}</div>
      <div data-testid="user-email">{user?.email || "none"}</div>
      <div data-testid="error-msg">{error || "none"}</div>

      <button
        onClick={() =>
          login({ email: "user@example.com", password: "pwd" }).catch(() => {})
        }
      >
        Trigger Login
      </button>

      <button
        onClick={() =>
          loginWithOtp({ email: "otp@example.com", otp: "123456" }).catch(() => {})
        }
      >
        Trigger OTP Login
      </button>

      <button
        onClick={() =>
          register({
            name: "New User",
            email: "reg@example.com",
            password: "pwd",
            otp: "123456",
          }).catch(() => {})
        }
      >
        Trigger Register
      </button>

      <button onClick={() => sendOtp("send@example.com").catch(() => {})}>
        Trigger Send OTP
      </button>

      <button onClick={() => logout()}>Trigger Logout</button>
      <button onClick={() => refreshUser()}>Trigger Refresh User</button>
      <button onClick={() => clearError()}>Trigger Clear Error</button>
    </div>
  );
};

describe("AuthContext and useAuth hook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("throws error when useAuth is used outside AuthProvider", () => {
    // Suppress console.error for expected react error boundary
    const originalConsoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestAuthConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    console.error = originalConsoleError;
  });

  it("initializes as unauthenticated when no token is stored", async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("is-authed")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });

  it("attempts token refresh if getProfile fails on mount", async () => {
    setStoredToken("old_access_token");
    vi.spyOn(authService, "getProfile").mockRejectedValueOnce(new Error("Expired"));
    vi.spyOn(authService, "refresh").mockResolvedValueOnce({
      user: {
        userId: "refreshed_id",
        email: "refreshed@example.com",
        name: "Refreshed User",
        userRole: "Regular",
      },
      accessToken: "new_token",
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "refreshed@example.com"
      );
    });

    expect(screen.getByTestId("is-authed")).toHaveTextContent("true");
  });

  it("clears user and stored token if both getProfile and refresh fail", async () => {
    setStoredToken("bad_token");
    vi.spyOn(authService, "getProfile").mockRejectedValueOnce(new Error("Invalid"));
    vi.spyOn(authService, "refresh").mockRejectedValueOnce(new Error("Session dead"));

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("is-authed")).toHaveTextContent("false");
    expect(getStoredToken()).toBeNull();
  });

  it("handles login, login error, and clearError", async () => {
    vi.spyOn(authService, "login").mockRejectedValueOnce(
      new Error("Invalid credentials")
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    await act(async () => {
      screen.getByText("Trigger Login").click();
    });

    expect(screen.getByTestId("error-msg")).toHaveTextContent("Invalid credentials");

    act(() => {
      screen.getByText("Trigger Clear Error").click();
    });

    expect(screen.getByTestId("error-msg")).toHaveTextContent("none");
  });

  it("handles loginWithOtp failure", async () => {
    vi.spyOn(authService, "loginWithOtp").mockRejectedValueOnce(
      new Error("OTP expired")
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger OTP Login").click();
    });

    expect(screen.getByTestId("error-msg")).toHaveTextContent("OTP expired");
  });

  it("handles register and sendOtp failures", async () => {
    vi.spyOn(authService, "register").mockRejectedValueOnce(
      new Error("Email already taken")
    );
    vi.spyOn(authService, "sendOtp").mockRejectedValueOnce(
      new Error("Mail provider rate limited")
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Register").click();
    });
    expect(screen.getByTestId("error-msg")).toHaveTextContent("Email already taken");

    await act(async () => {
      screen.getByText("Trigger Send OTP").click();
    });
    expect(screen.getByTestId("error-msg")).toHaveTextContent("Mail provider rate limited");
  });

  it("handles refreshUser success and failure", async () => {
    vi.spyOn(authService, "getProfile").mockResolvedValueOnce({
      userId: "u_ref",
      email: "ref@example.com",
      name: "Ref User",
      userRole: "Regular",
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Refresh User").click();
    });

    expect(screen.getByTestId("user-email")).toHaveTextContent("ref@example.com");

    // Failure case
    vi.spyOn(authService, "getProfile").mockRejectedValueOnce(new Error("Failed"));

    await act(async () => {
      screen.getByText("Trigger Refresh User").click();
    });

    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });

  it("handles logout execution", async () => {
    vi.spyOn(authService, "logout").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText("Trigger Logout").click();
    });

    expect(screen.getByTestId("is-authed")).toHaveTextContent("false");
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });
});
