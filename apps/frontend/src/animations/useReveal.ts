import { useRef, type RefObject } from "react";
import {
  gsap,
  prefersReducedMotion,
  scheduleVisibilityFallback,
  ScrollTrigger,
  useGSAP,
} from "./gsap";
import { MOTION, REVEAL_SELECTOR } from "./motion";

export interface RevealOptions {
  /** Descendant selector to animate. Defaults to every `[data-reveal]`. */
  selector?: string;
  /** Dependencies that should replay the reveal (e.g. async data readiness). */
  deps?: unknown[];
  /** Disable the reveal without unmounting. */
  enabled?: boolean;
  /** Vertical travel in px. */
  y?: number;
  /** Tween duration in seconds. */
  duration?: number;
  /** Stagger between matched elements in seconds. */
  stagger?: number;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
  /** Optional starting scale (used sparingly). */
  scale?: number;
  /**
   * Large lists: only reveal items as they scroll into view via
   * ScrollTrigger.batch, instead of tweening everything at once.
   */
  batch?: boolean;
  /** With `batch`, how many leading items reveal immediately (the visible ones). */
  immediate?: number;
  /** ScrollTrigger start position for batched reveals. */
  start?: string;
}

/**
 * Scoped entrance reveal built on `useGSAP` + gsap.context.
 *
 * Usage:
 *   const scope = useReveal({ deps: [isReady] });
 *   <div ref={scope}>
 *     <h1 data-reveal>Title</h1>
 *     <p data-reveal>Subtitle</p>
 *   </div>
 *
 * Returns a ref to attach to the element that scopes the reveal. Animations
 * are automatically reverted and listeners cleaned up on unmount or when
 * dependencies change, everything is skipped under reduced-motion, and a
 * visibility fallback guarantees content is never left hidden if the
 * animation ticker stalls.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {}
) {
  const scope = useRef<T>(null);
  const {
    selector = REVEAL_SELECTOR,
    deps = [],
    enabled = true,
    y = MOTION.distance.md,
    duration = MOTION.duration.base,
    stagger = MOTION.stagger.base,
    delay = 0,
    scale,
    batch = false,
    immediate = MOTION.maxStaggerItems,
    start = "top 92%",
  } = options;

  useGSAP(
    () => {
      if (!enabled || !scope.current || prefersReducedMotion()) return;

      const targets = gsap.utils.toArray<HTMLElement>(selector, scope.current);
      if (!targets.length) return;

      const fromVars: gsap.TweenVars = { opacity: 0, y };
      if (typeof scale === "number") fromVars.scale = scale;

      const toVars: gsap.TweenVars = {
        opacity: 1,
        y: 0,
        duration,
        ease: MOTION.ease.out,
        stagger,
        overwrite: "auto",
        clearProps: "opacity,transform",
      };
      if (typeof scale === "number") toVars.scale = 1;

      const cleanups: Array<() => void> = [];

      const runReveal = (elements: HTMLElement[], extraDelay = 0) => {
        gsap.fromTo(elements, fromVars, { ...toVars, delay: extraDelay });
        const span =
          (duration + extraDelay) * 1000 +
          stagger * 1000 * Math.min(elements.length, 24);
        cleanups.push(scheduleVisibilityFallback(elements, span));
      };

      if (!batch) {
        runReveal(targets, delay);
      } else {
        // Large lists: reveal the first (visible) batch right away and hand
        // the rest to ScrollTrigger so we never build hundreds of tweens.
        const head = targets.slice(0, immediate);
        const tail = targets.slice(immediate);

        if (head.length) runReveal(head, delay);

        if (tail.length) {
          const triggers = ScrollTrigger.batch(tail, {
            start,
            once: true,
            onEnter: (batchTargets) => runReveal(batchTargets as HTMLElement[]),
          });
          cleanups.push(() => triggers.forEach((trigger) => trigger.kill()));
        }
      }

      return () => cleanups.forEach((cancel) => cancel());
    },
    { scope, dependencies: deps }
  );

  return scope;
}

export interface EntranceOptions {
  /** Dependencies that should replay the entrance (usually a boolean "open" flag). */
  deps?: unknown[];
  enabled?: boolean;
  y?: number;
  duration?: number;
  delay?: number;
  scale?: number;
}

/**
 * Reveal a single element (or the scope root) into view. Ideal for
 * conditionally-rendered surfaces such as dropdown menus, alerts and result
 * panels. The returned ref must be attached to the element being revealed.
 */
export function useEntrance<T extends HTMLElement = HTMLDivElement>(
  options: EntranceOptions = {}
) {
  const scope = useRef<T>(null);
  const {
    deps = [],
    enabled = true,
    y = MOTION.distance.sm,
    duration = MOTION.duration.fast,
    delay = 0,
    scale,
  } = options;

  useGSAP(
    () => {
      if (!enabled || !scope.current || prefersReducedMotion()) return;

      const element = scope.current;
      const fromVars: gsap.TweenVars = { opacity: 0, y };
      if (typeof scale === "number") fromVars.scale = scale;

      const toVars: gsap.TweenVars = {
        opacity: 1,
        y: 0,
        duration,
        ease: MOTION.ease.out,
        delay,
        overwrite: "auto",
        clearProps: "opacity,transform",
      };
      if (typeof scale === "number") toVars.scale = 1;

      gsap.fromTo(element, fromVars, toVars);
      return scheduleVisibilityFallback(
        element,
        (duration + delay) * 1000
      );
    },
    { scope, dependencies: deps }
  );

  return scope;
}

/**
 * Coordinator for the two-panel problem workspace. Fades the layout in with
 * opacity only — no transform — so Monaco's layout/measurement is never
 * disturbed while it initializes.
 */
export function useWorkspaceReveal(
  deps: unknown[] = []
): RefObject<HTMLDivElement | null> {
  return useReveal({
    selector: "[data-workspace-reveal]",
    // Opacity only: never transform the editor surface while it initializes.
    y: 0,
    duration: MOTION.duration.slow,
    stagger: MOTION.stagger.tight,
    deps,
  });
}
