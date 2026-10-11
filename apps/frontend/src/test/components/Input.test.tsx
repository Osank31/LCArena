import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Input } from "../../components/common/Input";

describe("Input component", () => {
  it("renders label and associates with input", () => {
    render(<Input label="Email Address" placeholder="you@example.com" />);
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
  });

  it("handles text change events", () => {
    const handleChange = vi.fn();
    render(<Input label="Username" onChange={handleChange} />);

    const input = screen.getByLabelText("Username");
    fireEvent.change(input, { target: { value: "adalovelace" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders error message and sets aria-invalid", () => {
    render(<Input label="Password" error="Password must be at least 6 characters" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
  });

  it("renders helper text when no error exists", () => {
    render(<Input label="Code" helperText="Enter 6-digit confirmation code" />);
    expect(screen.getByText("Enter 6-digit confirmation code")).toBeInTheDocument();
  });

  it("renders leftIcon and rightIcon", () => {
    render(
      <Input
        label="Search"
        leftIcon={<span data-testid="search-left">S</span>}
        rightIcon={<span data-testid="search-right">X</span>}
      />
    );
    expect(screen.getByTestId("search-left")).toBeInTheDocument();
    expect(screen.getByTestId("search-right")).toBeInTheDocument();
  });
});
