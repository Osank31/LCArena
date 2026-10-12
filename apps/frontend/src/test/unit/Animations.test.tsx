import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import {
  gsap,
  MOTION,
  prefersReducedMotion,
  scheduleVisibilityFallback,
  useEntrance,
  useReveal,
} from "../../animations";

const originalMatchMedia = window.matchMedia;

/** Replace matchMedia so `prefersReducedMotion()` can be driven in tests. */
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

const RevealProbe: React.FC<{ batch?: boolean }> = ({ batch = false }) => {
  const scope = useReveal({ duration: 0.01, batch, immediate: 1 });
  return (
    <div ref={scope}>
      <h1 data-reveal>Alpha</h1>
      <p data-reveal>Beta</p>
    </div>
  );
};

const EntranceProbe: React.FC = () => {
  const ref = useEntrance({ duration: 0.01 });
  return <div ref={ref}>Surface</div>;
};

describe("animation architecture", () => {
  it("exposes restrained motion tokens", () => {
    expect(MOTION.duration.base).toBeLessThan(0.45);
    expect(MOTION.distance.md).toBeLessThanOrEqual(14);
    expect(MOTION.ease.out).toMatch(/power/);
  });

  it("reports reduced motion from the centralized media query", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);

    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("leaves content fully visible and untouched under reduced motion", () => {
    mockReducedMotion(true);
    render(<RevealProbe />);

    const heading = screen.getByText("Alpha");
    // No inline animation styles applied — the reveal is skipped entirely.
    expect(heading.style.opacity).toBe("");
    expect(heading.style.transform).toBe("");
    expect(window.getComputedStyle(heading).opacity).toBe("1");
  });

  it("plays the reveal and resolves to natural styles", async () => {
    mockReducedMotion(false);
    render(<RevealProbe />);

    const heading = screen.getByText("Alpha");
    // GSAP applies the "from" state immediately on mount...
    expect(heading.style.opacity).toBe("0");

    // ...then finishes and clears its inline styles so content is never hidden.
    await waitFor(() => expect(heading.style.opacity).toBe(""), {
      timeout: 3000,
    });
    expect(window.getComputedStyle(heading).opacity).toBe("1");
  });

  it("reveals batched list items without removing them from the document", async () => {
    mockReducedMotion(false);
    render(<RevealProbe batch />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Alpha").style.opacity).toBe(""), {
      timeout: 3000,
    });
  });

  it("animates a single entrance and clears styles", async () => {
    mockReducedMotion(false);
    render(<EntranceProbe />);

    const el = screen.getByText("Surface");
    expect(el.style.opacity).toBe("0");
    await waitFor(() => expect(el.style.opacity).toBe(""), { timeout: 3000 });
  });

  it("restores visibility via the fallback even if a tween never completes", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    // Simulate a reveal stuck at its hidden "from" state.
    gsap.set(el, { opacity: 0, y: 12 });
    expect(el.style.opacity).toBe("0");

    const cancel = scheduleVisibilityFallback(el, 0);
    await waitFor(() => expect(el.style.opacity).toBe(""), { timeout: 2000 });
    cancel();

    el.remove();
  });
});
