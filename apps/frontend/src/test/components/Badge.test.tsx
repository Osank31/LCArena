import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Badge, DifficultyBadge, RoleBadge } from "../../components/common/Badge";

describe("Badge components", () => {
  it("renders base Badge with children", () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
    // Paper theme renders success as a strong ink outline "stamp".
    expect(screen.getByText("Active")).toHaveClass("border-ink");
  });

  it("renders DifficultyBadge for Easy, Medium, Hard", () => {
    const { rerender } = render(<DifficultyBadge difficulty="Easy" />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toHaveClass("border-ink");

    rerender(<DifficultyBadge difficulty="Medium" />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toHaveClass("border-dashed");

    rerender(<DifficultyBadge difficulty="Hard" />);
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toHaveClass("bg-ink");
  });

  it("renders RoleBadge for Admin, Premium, Regular", () => {
    const { rerender } = render(<RoleBadge role="Admin" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toHaveClass("bg-ink");

    rerender(<RoleBadge role="Premium" />);
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toHaveClass("border-dashed");

    rerender(<RoleBadge role="Regular" />);
    expect(screen.getByText("Regular")).toBeInTheDocument();
  });
});
