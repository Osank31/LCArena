import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ProblemFilters } from "../../components/problem/ProblemFilters";
import { ProblemRow } from "../../components/problem/ProblemRow";
import { ParsedProblem, ProblemFilterState } from "../../types/problem.types";

describe("ProblemFilters component", () => {
  const initialFilters: ProblemFilterState = {
    search: "",
    difficulty: "All",
    tag: "All",
    sortBy: "id",
    sortOrder: "asc",
    page: 1,
    pageSize: 20,
  };

  it("handles search input change", () => {
    const handleChange = vi.fn();
    render(
      <ProblemFilters
        filters={initialFilters}
        onChange={handleChange}
        onReset={() => {}}
        availableTags={["Array", "String"]}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search problems/i);
    fireEvent.change(searchInput, { target: { value: "Two Sum" } });
    expect(handleChange).toHaveBeenCalledWith({ search: "Two Sum", page: 1 });
  });

  it("handles difficulty filter selection", () => {
    const handleChange = vi.fn();
    render(
      <ProblemFilters
        filters={initialFilters}
        onChange={handleChange}
        onReset={() => {}}
        availableTags={["Array", "String"]}
      />
    );

    fireEvent.click(screen.getByText("Easy"));
    expect(handleChange).toHaveBeenCalledWith({ difficulty: "Easy", page: 1 });
  });

  it("handles topic tag selection", () => {
    const handleChange = vi.fn();
    render(
      <ProblemFilters
        filters={initialFilters}
        onChange={handleChange}
        onReset={() => {}}
        availableTags={["Array", "String"]}
      />
    );

    const tagSelect = screen.getByLabelText(/filter by topic tag/i);
    fireEvent.change(tagSelect, { target: { value: "Array" } });
    expect(handleChange).toHaveBeenCalledWith({ tag: "Array", page: 1 });
  });

  it("shows reset button when active filters exist and triggers reset", () => {
    const handleReset = vi.fn();
    render(
      <ProblemFilters
        filters={{ ...initialFilters, search: "algo" }}
        onChange={() => {}}
        onReset={handleReset}
        availableTags={["Array"]}
      />
    );

    const resetBtn = screen.getByText("Reset");
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});

describe("ProblemRow component", () => {
  const sampleProblem: ParsedProblem = {
    id: "prob_1",
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    timeLimit: 2000,
    statement: "Find two numbers.",
    examples: [],
    constraints: [],
    starterTemplates: {},
    sampleTestCaseUrl: "sample.txt",
    testCasesUrl: "testcases.zip",
    rawDescription: "desc",
  };

  it("renders problem title, index, tags and difficulty", () => {
    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ProblemRow problem={sampleProblem} index={1} isSolved={false} />
          </tbody>
        </table>
      </BrowserRouter>
    );

    expect(screen.getByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Array")).toBeInTheDocument();
    expect(screen.getByText("Hash Table")).toBeInTheDocument();
    expect(screen.getByText("2.0s")).toBeInTheDocument();
    expect(screen.getByLabelText("Unsolved")).toBeInTheDocument();
  });

  it("renders solved checkmark icon when isSolved is true", () => {
    render(
      <BrowserRouter>
        <table>
          <tbody>
            <ProblemRow problem={sampleProblem} index={1} isSolved={true} />
          </tbody>
        </table>
      </BrowserRouter>
    );

    expect(screen.getByTestId("solved-icon")).toBeInTheDocument();
  });
});
