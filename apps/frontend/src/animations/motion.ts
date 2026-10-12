/**
 * LCArena motion tokens — the single source of truth for the
 * "paper & ink" animation language.
 *
 * The values are deliberately restrained: short durations, small vertical
 * travel and a gentle power-out easing so motion reads like turning a page
 * rather than a product demo. Components should reference these tokens
 * instead of hard-coding their own timings.
 */
export const MOTION = {
  /** Durations in seconds (GSAP time base). */
  duration: {
    /** Local state changes / confirmation feedback. */
    micro: 0.14,
    /** Dropdowns, tooltips, menus. */
    fast: 0.2,
    /** Standard content entrance. */
    base: 0.3,
    /** Coordinated page / panel reveals. */
    slow: 0.42,
  },
  /** Restrained easing curves. */
  ease: {
    out: "power2.out",
    inOut: "power2.inOut",
    soft: "power1.out",
  },
  /** Vertical entrance distance in pixels. */
  distance: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
  },
  /** Stagger interval between related elements, in seconds. */
  stagger: {
    tight: 0.03,
    base: 0.045,
    loose: 0.06,
  },
  /** Stagger past this many items instantly to keep long lists cheap. */
  maxStaggerItems: 14,
} as const;

/**
 * Marks an element for a scoped entrance reveal. `useReveal` animates every
 * `[data-reveal]` descendant of its scope, in DOM order.
 */
export const REVEAL_ATTRIBUTE = "data-reveal";

/** Selector string matching a single reveal target. */
export const REVEAL_SELECTOR = `[${REVEAL_ATTRIBUTE}]`;

/** Reduced-motion media query, centralized for every animation helper. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
