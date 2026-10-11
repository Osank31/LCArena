import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Navbar } from "../../components/common/Navbar";
import { AuthProvider } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { setStoredToken } from "../../services/apiClient";

describe("Navbar component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders brand logo and public navigation links", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText("LCArena")).toBeInTheDocument();
    expect(screen.getByText("Problems")).toBeInTheDocument();
    expect(screen.getByText("Submissions")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("renders user information, opens dropdown, and executes logout", async () => {
    setStoredToken("valid_jwt");
    vi.spyOn(authService, "getProfile").mockResolvedValueOnce({
      userId: "u123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      userRole: "Admin",
    });
    vi.spyOn(authService, "logout").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    // Open user dropdown
    fireEvent.click(screen.getByText("Ada Lovelace"));
    expect(screen.getByText("Profile & Stats")).toBeInTheDocument();

    const signOutBtn = screen.getByText("Sign Out");
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  it("toggles mobile menu on burger click when unauthenticated", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    const toggleBtn = screen.getByLabelText("Toggle navigation menu");
    fireEvent.click(toggleBtn);

    // Mobile drawer items
    expect(screen.getAllByText("Problems").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Sign In").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Register").length).toBeGreaterThanOrEqual(2);

    // Click links inside mobile menu
    const mobileProblems = screen.getAllByRole("link", { name: /problems/i })[1];
    fireEvent.click(mobileProblems);

    fireEvent.click(toggleBtn);
    const mobileSignIn = screen.getAllByRole("link", { name: /sign in/i })[1];
    fireEvent.click(mobileSignIn);

    fireEvent.click(toggleBtn);
    const mobileRegister = screen.getAllByRole("link", { name: /register/i })[1];
    fireEvent.click(mobileRegister);
  });

  it("toggles mobile menu and handles logout when authenticated", async () => {
    setStoredToken("valid_jwt");
    vi.spyOn(authService, "getProfile").mockResolvedValueOnce({
      userId: "u123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      userRole: "Regular",
    });
    vi.spyOn(authService, "logout").mockResolvedValueOnce();

    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    const toggleBtn = screen.getByLabelText("Toggle navigation menu");
    fireEvent.click(toggleBtn);

    const profileLink = screen.getByRole("link", { name: /profile & stats/i });
    fireEvent.click(profileLink);

    fireEvent.click(toggleBtn);
    const mobileSignOut = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(mobileSignOut);

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
  });
});
