import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Alert } from "../../components/common/Alert";
import { EmptyState } from "../../components/common/EmptyState";

describe("Alert component", () => {
  it("renders message and type correctly", () => {
    render(<Alert type="error" title="Auth Error" message="Invalid email" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Auth Error")).toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("handles dismiss click", () => {
    const handleDismiss = vi.fn();
    render(<Alert message="Dismissible notice" onDismiss={handleDismiss} />);

    fireEvent.click(screen.getByLabelText("Dismiss alert"));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("EmptyState component", () => {
  it("renders title, description and action button", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Results"
        description="Try a different search query"
        actionText="Clear Filter"
        onAction={handleAction}
      />
    );

    expect(screen.getByText("No Results")).toBeInTheDocument();
    expect(screen.getByText("Try a different search query")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear Filter"));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
