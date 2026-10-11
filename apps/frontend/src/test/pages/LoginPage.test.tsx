import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../../pages/LoginPage";
import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";

describe("LoginPage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders login form with password tab default", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("validates empty fields on submission", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.submit(screen.getByRole("button", { name: /^sign in$/i }).closest("form")!);
    expect(await screen.findByText(/please fill in both email and password/i)).toBeInTheDocument();
  });

  it("handles successful password login", async () => {
    vi.spyOn(authService, "login").mockResolvedValueOnce({
      user: {
        userId: "u123",
        email: "user@example.com",
        name: "Test User",
        userRole: "Regular",
      },
      accessToken: "access_token_123",
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "mypassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "mypassword",
      });
    });
  });

  it("switches to OTP login tab and handles OTP send & verify", async () => {
    vi.spyOn(authService, "sendOtp").mockResolvedValueOnce();
    vi.spyOn(authService, "loginWithOtp").mockResolvedValueOnce({
      user: {
        userId: "u123",
        email: "otpuser@example.com",
        name: "OTP User",
        userRole: "Regular",
      },
      accessToken: "otp_token_123",
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    // Switch to OTP tab
    fireEvent.click(screen.getByText("Passwordless OTP"));

    // Enter email
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "otpuser@example.com" },
    });

    // Click Send Code
    fireEvent.click(screen.getByText("Send Code"));

    expect(await screen.findByText(/verification code dispatched/i)).toBeInTheDocument();
    expect(authService.sendOtp).toHaveBeenCalledWith("otpuser@example.com");

    // Enter OTP
    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: "654321" },
    });

    // Submit OTP Login
    fireEvent.click(screen.getByRole("button", { name: /verify & sign in/i }));

    await waitFor(() => {
      expect(authService.loginWithOtp).toHaveBeenCalledWith({
        email: "otpuser@example.com",
        otp: "654321",
      });
    });
  });
});
