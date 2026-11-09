import { describe, expect, it } from "vitest";
import {
  extractTitle,
  extractSlug,
  extractTags,
  hasBalancedFences,
} from "../../src/lib/markdown";

describe("extractTitle", () => {
  it("extracts the first H1 heading", () => {
    expect(extractTitle("# Two Sum\n\nbody")).toBe("Two Sum");
  });

  it("trims surrounding whitespace", () => {
    expect(extractTitle("#   Two Sum   \n\nbody")).toBe("Two Sum");
  });

  it("returns undefined when there is no H1", () => {
    expect(extractTitle("just a paragraph\n\n## not H1")).toBeUndefined();
  });
});

describe("extractSlug", () => {
  it("derives a kebab-case slug", () => {
    expect(extractSlug("Two Sum")).toBe("two-sum");
    expect(extractSlug("Maximum Subarray Sum!")).toBe("maximum-subarray-sum");
  });

  it("returns undefined for empty input", () => {
    expect(extractSlug("")).toBeUndefined();
    expect(extractSlug("   ")).toBeUndefined();
  });
});

describe("extractTags", () => {
  it("extracts tags from a Topics line", () => {
    expect(extractTags("**Topics:** Array, Hash Table\n")).toEqual([
      "Array",
      "Hash Table",
    ]);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(extractTags("**topics:**  Dynamic Programming , Math  \n")).toEqual([
      "Dynamic Programming",
      "Math",
    ]);
  });

  it("returns an empty array when no Topics line exists", () => {
    expect(extractTags("# Title\n\nbody")).toEqual([]);
  });
});

describe("hasBalancedFences", () => {
  it("returns true for balanced fences", () => {
    expect(hasBalancedFences("```cpp\ncode\n```\n\n```py\ncode\n```")).toBe(
      true,
    );
  });

  it("returns false for unbalanced fences", () => {
    expect(hasBalancedFences("```cpp\ncode\n")).toBe(false);
  });

  it("returns true when there are no fences", () => {
    expect(hasBalancedFences("# Title\n\nbody")).toBe(true);
  });
});
