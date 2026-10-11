import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { RegisterPage } from "../../pages/RegisterPage";
import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";

describe("RegisterPage component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders registration form fields and controls", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("Create an Account")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /complete registration/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in here/i })).toBeInTheDocument();
  });

  it("validates invalid email before sending OTP", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));
    expect(
      await screen.findByText(/please enter a valid email address to receive your otp/i)
    ).toBeInTheDocument();
  });

  it("sends OTP successfully and shows confirmation alert", async () => {
    vi.spyOn(authService, "sendOtp").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));

    expect(
      await screen.findByText(/verification code dispatched to your email address!/i)
    ).toBeInTheDocument();
    expect(authService.sendOtp).toHaveBeenCalledWith("newuser@example.com");
  });

  it("shows error alert if OTP dispatch fails", async () => {
    vi.spyOn(authService, "sendOtp").mockRejectedValueOnce(
      new Error("Email delivery unavailable")
    );

    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "invalid@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));

    expect(
      await screen.findByText("Email delivery unavailable")
    ).toBeInTheDocument();
  });

  it("validates form fields on submission (name, password length, 6-digit OTP)", async () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const form = screen.getByRole("button", { name: /complete registration/i }).closest("form")!;

    // Empty name
    fireEvent.submit(form);
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();

    // Fill name, empty email
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Alice Walker" },
    });
    fireEvent.submit(form);
    expect(await screen.findByText(/valid email is required/i)).toBeInTheDocument();

    // Fill email, short password
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "123" },
    });
    fireEvent.submit(form);
    expect(
      await screen.findByText(/password must be at least 6 characters long/i)
    ).toBeInTheDocument();

    // Valid password, incomplete OTP
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "securepassword123" },
    });
    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: "123" },
    });
    fireEvent.submit(form);
    expect(
      await screen.findByText(/please provide the 6-digit verification code sent to your email/i)
    ).toBeInTheDocument();
  });

  it("submits registration successfully when all fields are valid", async () => {
    vi.spyOn(authService, "register").mockResolvedValueOnce({
      user: {
        userId: "u_new",
        email: "alice@example.com",
        name: "Alice Walker",
        userRole: "Regular",
      },
      accessToken: "token_abc_123",
    });

    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Alice Walker" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        name: "Alice Walker",
        email: "alice@example.com",
        password: "password123",
        otp: "123456",
      });
    });
  });

  it("displays server error message when registration fails", async () => {
    vi.spyOn(authService, "register").mockRejectedValueOnce(
      new Error("User with this email already exists")
    );

    render(
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Alice Walker" },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/6-digit verification code/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

    expect(
      await screen.findByText("User with this email already exists")
    ).toBeInTheDocument();
  });
});
