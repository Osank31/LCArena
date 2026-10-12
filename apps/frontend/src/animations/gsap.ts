import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { REDUCED_MOTION_QUERY } from "./motion";

/**
 * Register the plugins the app relies on. `registerPlugin` is idempotent, and
 * registering `useGSAP` enables the `useGSAP()` hook's automatic
 * `gsap.context()` scoping + cleanup.
 */
gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Safety net for entrance animations.
 *
 * An entrance tween briefly holds content at its "from" state (opacity 0).
 * If the animation ticker is throttled — a backgrounded tab, a stalled
 * compositor — that tween may never advance and the content would stay
 * hidden. This guarantees the natural, fully-visible state is restored
 * shortly after the expected duration regardless of whether the tween
 * ever completed (clearing props is a no-op once the reveal has finished).
 *
 * @returns a cleanup function that cancels the pending fallback.
 */
export function scheduleVisibilityFallback(
  targets: gsap.DOMTarget,
  totalMs: number
): () => void {
  if (typeof window === "undefined") return () => {};
  const id = window.setTimeout(() => {
    gsap.set(targets, { clearProps: "opacity,transform,visibility" });
  }, Math.max(300, totalMs + 400));
  return () => window.clearTimeout(id);
}

/**
 * Centralized `prefers-reduced-motion` check.
 *
 * Every animation helper calls this before building a timeline, so a user who
 * asks their OS to reduce motion gets immediate, static state changes and
 * never any nonessential movement. When it returns `true` the helpers simply
 * do nothing, leaving elements in their natural (visible) state.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export { gsap, ScrollTrigger, useGSAP };
