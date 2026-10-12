import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
  ServerStatusModal,
  RUN_COMMAND,
  REPO_URL,
  MODAL_TITLE,
} from "../../components/common/ServerStatusModal";
import { apiClient } from "../../services/apiClient";

describe("ServerStatusModal component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render or block the screen by default when initialOpen is not set", () => {
    render(<ServerStatusModal />);
    expect(screen.queryByText(MODAL_TITLE)).not.toBeInTheDocument();
  });

  it("renders apology message, GitHub button, and clone command when opened", () => {
    render(<ServerStatusModal initialOpen={true} />);

    expect(screen.getByText(MODAL_TITLE)).toBeInTheDocument();
    expect(
      screen.getByText(/Sorry, I haven't deployed the backend yet! T-T/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/running the code execution servers and supporting infrastructure gets pretty expensive/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/LCArena is available as a frontend demo/i)
    ).toBeInTheDocument();
    expect(screen.getByText(RUN_COMMAND)).toBeInTheDocument();
    expect(screen.getByText(REPO_URL)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy run command/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy repository url/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /gitHub repository/i })).toHaveAttribute(
      "href",
      REPO_URL
    );
  });

  it("copies run command to clipboard when Copy Command button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ServerStatusModal initialOpen={true} />);

    const copyCmdBtn = screen.getByRole("button", { name: /copy run command/i });
    fireEvent.click(copyCmdBtn);

    expect(writeTextMock).toHaveBeenCalledWith(RUN_COMMAND);
    expect(await screen.findByText("Copied!")).toBeInTheDocument();
  });

  it("copies repo URL to clipboard when Copy URL button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ServerStatusModal initialOpen={true} />);

    const copyUrlBtn = screen.getByRole("button", { name: /copy repository url/i });
    fireEvent.click(copyUrlBtn);

    expect(writeTextMock).toHaveBeenCalledWith(REPO_URL);
    expect(await screen.findByText("URL Copied!")).toBeInTheDocument();
  });

  it("dismisses modal when Dismiss button is clicked", () => {
    const handleDismiss = vi.fn();
    render(<ServerStatusModal initialOpen={true} onDismiss={handleDismiss} />);

    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(MODAL_TITLE)).not.toBeInTheDocument();
  });

  it("handles retry connection successfully when health check passes", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: { message: "Healthy" } });
    const handleDismiss = vi.fn();

    render(<ServerStatusModal initialOpen={true} onDismiss={handleDismiss} />);

    const retryBtn = screen.getByRole("button", { name: /retry connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/health", expect.any(Object));
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error message when retry connection fails", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("Connection refused"));

    render(<ServerStatusModal initialOpen={true} />);

    const retryBtn = screen.getByRole("button", { name: /retry connection/i });
    fireEvent.click(retryBtn);

    expect(
      await screen.findByText(/server is still unreachable/i)
    ).toBeInTheDocument();
  });
});
