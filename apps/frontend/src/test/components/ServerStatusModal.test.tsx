import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import {
  ServerStatusModal,
  RUN_COMMAND,
  REPO_URL,
} from "../../components/common/ServerStatusModal";
import { apiClient } from "../../services/apiClient";

describe("ServerStatusModal component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders offline banner, clone command, and repo URL when opened", () => {
    render(<ServerStatusModal initialOpen={true} />);

    expect(screen.getByText("Server Connection Required")).toBeInTheDocument();
    expect(screen.getByText("Backend Server is Offline")).toBeInTheDocument();
    expect(screen.getByText(RUN_COMMAND)).toBeInTheDocument();
    expect(screen.getByText(REPO_URL)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy run command/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy repository url/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
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
    expect(screen.queryByText("Server Connection Required")).not.toBeInTheDocument();
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
