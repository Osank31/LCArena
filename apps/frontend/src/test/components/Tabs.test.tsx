import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Tabs } from "../../components/common/Tabs";

describe("Tabs component", () => {
  const tabs = [
    { id: "description", label: "Description" },
    { id: "submissions", label: "Submissions", count: 3 },
    { id: "solution", label: "Solutions" },
  ];

  it("renders all tabs and counts", () => {
    render(<Tabs tabs={tabs} activeTab="description" onChange={() => {}} />);

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Submissions")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected true", () => {
    render(<Tabs tabs={tabs} activeTab="submissions" onChange={() => {}} />);

    const selectedTab = screen.getByRole("tab", { name: /submissions/i });
    expect(selectedTab).toHaveAttribute("aria-selected", "true");
  });

  it("triggers onChange when a tab is clicked", () => {
    const handleChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="description" onChange={handleChange} />);

    fireEvent.click(screen.getByText("Solutions"));
    expect(handleChange).toHaveBeenCalledWith("solution");
  });

  it("renders pill variant", () => {
    render(
      <Tabs
        tabs={tabs}
        activeTab="description"
        onChange={() => {}}
        variant="pill"
      />
    );
    expect(screen.getByRole("tablist")).toHaveClass("bg-slate-900/80");
  });
});
