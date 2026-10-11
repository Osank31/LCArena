import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { LandingPage } from "../../pages/LandingPage";
import { problemService } from "../../services/problemService";

describe("LandingPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders hero section, headline and call to actions", () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValue([]);

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Secure Sandboxed Arena/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore 50\+ Problems/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Free Account/i)).toBeInTheDocument();
  });

  it("renders platform metrics and features", () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValue([]);

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Ephemeral Sandboxing")).toBeInTheDocument();
    expect(screen.getByText("Multi-Language Runtime")).toBeInTheDocument();
    expect(screen.getByText("AI Code Completion")).toBeInTheDocument();
    expect(screen.getByText("Docker Sandboxed")).toBeInTheDocument();
  });

  it("renders popular problems fetched from service", async () => {
    vi.spyOn(problemService, "getAllProblems").mockResolvedValue([
      {
        id: "p1",
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "Easy",
        tags: ["Array"],
        timeLimit: 2000,
        statement: "",
        examples: [],
        constraints: [],
        starterTemplates: {},
        sampleTestCaseUrl: "",
        testCasesUrl: "",
        rawDescription: "",
      },
    ]);

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Solve")).toBeInTheDocument();
  });
});
