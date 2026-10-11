import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { NotFoundPage } from "../../pages/NotFoundPage";

describe("NotFoundPage component", () => {
  it("renders 404 header, explanation, and action links", () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    expect(
      screen.getByText(/the challenge or route you are looking for does not exist/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse problems/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go home/i })).toBeInTheDocument();
  });
});
