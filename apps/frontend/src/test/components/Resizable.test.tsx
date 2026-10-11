import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Resizable, { Panel } from "../../components/Resizable";

describe("Resizable and Panel components", () => {
  it("renders Panel component with children", () => {
    render(
      <Panel className="custom-panel" style={{ color: "red" }}>
        <span>Panel Content</span>
      </Panel>
    );

    expect(screen.getByText("Panel Content")).toBeInTheDocument();
  });

  it("renders Resizable horizontally with two children", () => {
    const onResizeMock = vi.fn();

    const { container } = render(
      <Resizable direction="horizontal" initialSize={40} onResize={onResizeMock}>
        <div>Left Child</div>
        <div>Right Child</div>
      </Resizable>
    );

    expect(screen.getByText("Left Child")).toBeInTheDocument();
    expect(screen.getByText("Right Child")).toBeInTheDocument();

    const divider = container.querySelector('[style*="col-resize"]') as HTMLElement;
    expect(divider).toBeInTheDocument();

    // Hover events
    fireEvent.pointerEnter(divider);
    fireEvent.pointerLeave(divider);
  });

  it("renders Resizable vertically with two children", () => {
    const { container } = render(
      <Resizable direction="vertical" initialSize={60}>
        <div>Top Child</div>
        <div>Bottom Child</div>
      </Resizable>
    );

    expect(screen.getByText("Top Child")).toBeInTheDocument();
    expect(screen.getByText("Bottom Child")).toBeInTheDocument();

    const divider = container.querySelector('[style*="row-resize"]') as HTMLElement;
    expect(divider).toBeInTheDocument();
  });

  it("handles pointer drag and updates size", () => {
    const onResizeMock = vi.fn();

    // Mock getBoundingClientRect on container
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    const { container } = render(
      <Resizable
        direction="horizontal"
        initialSize={50}
        minSize={100}
        maxSize={800}
        onResize={onResizeMock}
      >
        <div>Left Pane</div>
        <div>Right Pane</div>
      </Resizable>
    );

    const divider = container.querySelector('[style*="col-resize"]') as HTMLElement;

    // Simulate pointer down (left click)
    fireEvent.pointerDown(divider, {
      button: 0,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    // Simulate pointer move
    fireEvent.pointerMove(divider, {
      clientX: 400,
      clientY: 0,
      pointerId: 1,
    });

    expect(onResizeMock).toHaveBeenCalledWith(40);

    // Simulate pointer up
    fireEvent.pointerUp(divider, {
      pointerId: 1,
    });

    // Cleanup
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it("handles vertical pointer drag", () => {
    const onResizeMock = vi.fn();

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 1000,
      top: 0,
      left: 0,
      bottom: 1000,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    const { container } = render(
      <Resizable
        direction="vertical"
        initialSize={50}
        minSize={100}
        onResize={onResizeMock}
      >
        <div>Top Pane</div>
        <div>Bottom Pane</div>
      </Resizable>
    );

    const divider = container.querySelector('[style*="row-resize"]') as HTMLElement;

    fireEvent.pointerDown(divider, {
      button: 0,
      pointerId: 1,
      preventDefault: vi.fn(),
    });

    fireEvent.pointerMove(divider, {
      clientX: 0,
      clientY: 300,
      pointerId: 1,
    });

    expect(onResizeMock).toHaveBeenCalledWith(30);

    fireEvent.pointerCancel(divider, {
      pointerId: 1,
    });

    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });
});
