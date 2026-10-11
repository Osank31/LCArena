import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Modal } from "../../components/common/Modal";

describe("Modal component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Modal Content
      </Modal>
    );
    expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
  });

  it("renders title, description and children when isOpen is true", () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Confirm Submission"
        description="Are you sure you want to proceed?"
      >
        <p>Detailed body content</p>
      </Modal>
    );

    expect(screen.getByText("Confirm Submission")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    expect(screen.getByText("Detailed body content")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    );

    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    );

    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
