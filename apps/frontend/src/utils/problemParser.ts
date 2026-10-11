import { IProblem, ParsedProblem, ProblemExample } from "../types/problem.types";
import { DEFAULT_STARTER_CODE } from "./starterCode";

export function parseProblem(raw: IProblem): ParsedProblem {
  const desc = raw.description || "";
  let title = raw.title || "";
  let tags = raw.tags && raw.tags.length > 0 ? [...raw.tags] : [];
  let slug = raw.slug || "";

  // 1. Extract title if not provided directly
  if (!title) {
    const titleMatch = desc.match(/^#\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      title = `Problem ${raw._id ? raw._id.slice(-4) : "1"}`;
    }
  }

  // 2. Generate slug if not provided
  if (!slug) {
    slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  // 3. Extract tags from description if empty
  if (tags.length === 0) {
    const topicsMatch = desc.match(/\*\*Topics:\*\*\s*([^\n\r]+)/);
    if (topicsMatch) {
      tags = topicsMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      tags = ["Algorithm"];
    }
  }

  // 4. Extract statement (between ## Description and ## Examples, or raw text)
  let statement = desc;
  const descSection = desc.match(/##\s*Description([\s\S]*?)(?=##\s*Examples|$)/i);
  if (descSection) {
    statement = descSection[1].trim();
  } else {
    // Strip the title and topic lines if at start
    statement = desc
      .replace(/^#\s*.+$/m, "")
      .replace(/\*\*Difficulty:\*\*.*$/m, "")
      .trim();
  }

  // 5. Extract Examples
  const examples: ProblemExample[] = [];
  const exampleRegex = /###\s*Example\s*\d*[\s\S]*?\*\*Input:\*\*\s*`?([^\n`]+)`?[\s\S]*?\*\*Output:\*\*\s*`?([^\n`]+)`?(?:[\s\S]*?\*\*Explanation:\*\*\s*([^\n\r]+))?/gi;
  let exMatch;
  while ((exMatch = exampleRegex.exec(desc)) !== null) {
    examples.push({
      input: exMatch[1].trim(),
      output: exMatch[2].trim(),
      explanation: exMatch[3] ? exMatch[3].trim() : undefined,
    });
  }

  // Fallback sample if no markdown example found
  if (examples.length === 0) {
    examples.push({
      input: "Sample Input via stdin",
      output: "Expected output",
      explanation: "Verify against problem constraints.",
    });
  }

  // 6. Extract Constraints
  const constraints: string[] = [];
  const constrSection = desc.match(/##\s*Constraints([\s\S]*?)(?=##|$)/i);
  if (constrSection) {
    const lines = constrSection[1].split("\n");
    for (const line of lines) {
      const trimmed = line.trim().replace(/^[-*]\s*/, "");
      if (trimmed) constraints.push(trimmed);
    }
  } else {
    constraints.push("Standard memory limit: 256MB");
    constraints.push(`Time limit: ${raw.time_limit || 2000}ms per test case`);
  }

  return {
    id: raw._id,
    title,
    slug,
    difficulty: raw.difficulty,
    tags,
    timeLimit: raw.time_limit || 3000,
    statement,
    examples,
    constraints,
    starterTemplates: { ...DEFAULT_STARTER_CODE },
    sampleTestCaseUrl: raw.sampleTestCaseUrl || "",
    testCasesUrl: raw.testCasesUrl || "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    rawDescription: desc,
  };
}
