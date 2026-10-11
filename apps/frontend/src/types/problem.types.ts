export type Difficulty = "Easy" | "Medium" | "Hard";

export interface IProblem {
  _id: string;
  description: string;
  difficulty: Difficulty;
  sampleTestCaseUrl: string;
  testCasesUrl: string;
  time_limit: number;
  createdAt?: string;
  updatedAt?: string;
  title?: string;
  slug?: string;
  tags?: string[];
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ParsedProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  statement: string;
  examples: ProblemExample[];
  constraints: string[];
  starterTemplates: Record<string, string>;
  sampleTestCaseUrl: string;
  testCasesUrl: string;
  createdAt?: string;
  updatedAt?: string;
  rawDescription: string;
}

export interface ProblemFilterState {
  search: string;
  difficulty: string;
  tag: string;
  sortBy: "id" | "title" | "difficulty";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}
