import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Code2,
  FileText,
  History,
  Play,
  RotateCcw,
  Send,
  Terminal,
} from "lucide-react";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Skeleton } from "../components/common/Skeleton";
import { Tabs } from "../components/common/Tabs";
import { useWorkspaceReveal } from "../animations";
import { CodeEditorPane } from "../components/problem/CodeEditorPane";
import { OutputConsole } from "../components/problem/OutputConsole";
import { ProblemDescription } from "../components/problem/ProblemDescription";
import { SubmissionHistoryTab } from "../components/problem/SubmissionHistoryTab";
import { WorkspaceHeader } from "../components/problem/WorkspaceHeader";
import Resizable from "../components/Resizable";
import { useAuth } from "../context/AuthContext";
import { problemService } from "../services/problemService";
import { submissionService } from "../services/submissionService";
import { ParsedProblem } from "../types/problem.types";
import {
  ExecutionResult,
  ISubmission,
  SupportedLanguage,
} from "../types/submission.types";
import { DEFAULT_STARTER_CODE } from "../utils/starterCode";
import { runCode } from "../utils/codeRunner";

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [problem, setProblem] = useState<ParsedProblem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [language, setLanguage] = useState<SupportedLanguage>("cpp");
  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>({
    cpp: DEFAULT_STARTER_CODE.cpp,
    py: DEFAULT_STARTER_CODE.py,
    java: DEFAULT_STARTER_CODE.java,
    js: DEFAULT_STARTER_CODE.js,
  });

  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [leftTab, setLeftTab] = useState<string>("description");
  const [mobileTab, setMobileTab] = useState<"description" | "editor" | "console">("editor");

  // Execution states
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);

  // Modals
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Coordinated (opacity-only) reveal of the workspace chrome once the problem
  // resolves. The editor surface stays completely stable while the user works.
  const workspaceScope = useWorkspaceReveal([problem?.id]);

  // Load problem details
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    problemService
      .getProblemById(id)
      .then((prob) => {
        if (!isMounted) return;
        setProblem(prob);

        // Load custom or starter code
        const savedCode = localStorage.getItem(`lcarena_code_${id}_${language}`);
        if (savedCode) {
          setCodeMap((prev) => ({ ...prev, [language]: savedCode }));
        }

        // Load local submissions for this problem
        const effectiveUserId = user?.userId || (user as any)?.id;
        const userSubs = submissionService.getProblemSubmissions(id, effectiveUserId);
        setSubmissions(userSubs);
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(
            err.response?.data?.message || err.message || "Failed to load problem."
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, language]);

  // Sync submissions whenever id or authenticated user resolves
  useEffect(() => {
    if (!id) return;
    const effectiveUserId = user?.userId || (user as any)?.id;
    const userSubs = submissionService.getProblemSubmissions(id, effectiveUserId);
    setSubmissions(userSubs);
  }, [id, user?.userId, (user as any)?.id]);

  const currentCode = codeMap[language];

  const handleCodeChange = (newCode: string) => {
    setCodeMap((prev) => ({ ...prev, [language]: newCode }));
    if (id) {
      localStorage.setItem(`lcarena_code_${id}_${language}`, newCode);
    }
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (id) {
      const savedCode = localStorage.getItem(`lcarena_code_${id}_${newLang}`);
      if (!savedCode && DEFAULT_STARTER_CODE[newLang]) {
        setCodeMap((prev) => ({ ...prev, [newLang]: DEFAULT_STARTER_CODE[newLang] }));
      }
    }
  };

  const handleResetCode = () => {
    const defaultTemplate = DEFAULT_STARTER_CODE[language];
    handleCodeChange(defaultTemplate);
    setShowResetModal(false);
  };

  // Run code against sample test cases
  const handleRun = () => {
    if (isEvaluating || !problem) return;
    setIsEvaluating(true);
    setRunOutput(null);
    setExecutionResult(null);

    // Evaluate code against problem sample test cases
    setTimeout(() => {
      try {
        const evaluation = runCode(currentCode, language, problem);
        setRunOutput(evaluation.outputMessage);
      } catch (err: any) {
        setRunOutput(
          `[Run Evaluation - Error]\nTested against sample input:\nExecution failed: ${
            err.message || String(err)
          }`
        );
      } finally {
        setIsEvaluating(false);
        setMobileTab("console");
      }
    }, 300);
  };

  // Submit code to backend judge
  const handleSubmit = async () => {
    if (!id || !problem) return;
    if (isEvaluating) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setIsEvaluating(true);
    setRunOutput(null);
    setExecutionResult({ status: "PENDING" });
    setMobileTab("console");

    try {
      const submission = await submissionService.createSubmission({
        problemId: id,
        code: currentCode,
        language,
      });

      // Update submissions list
      setSubmissions((prev) => [submission, ...prev.filter((s) => s._id !== submission._id)]);

      // Poll verdict until completed
      const finalSubmission = await submissionService.pollVerdict(
        submission._id,
        (updated) => {
          setExecutionResult(updated.status);
        }
      );

      setExecutionResult(finalSubmission.status);
      setSubmissions((prev) => [
        finalSubmission,
        ...prev.filter((s) => s._id !== finalSubmission._id),
      ]);
    } catch (err: any) {
      setExecutionResult({
        status: "INTERNAL_ERROR",
        message:
          err.response?.data?.message ||
          err.message ||
          "Submission failed. Check network or server status.",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex flex-col p-6 space-y-4 bg-paper">
        <Skeleton className="h-10 w-1/3" />
        <div className="flex-1 grid grid-cols-2 gap-4">
          <Skeleton className="h-full rounded-xl" />
          <Skeleton className="h-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center bg-paper">
        <Alert
          type="error"
          title="Problem Not Found"
          message={error || "This problem could not be found."}
        />
        <Link to="/problems" className="mt-6 inline-block">
          <Button variant="secondary">Back to Problems Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={workspaceScope}
      className="h-[calc(100vh-3.5rem)] flex flex-col bg-paper overflow-hidden"
      data-testid="problem-workspace"
    >
      {/* Header bar */}
      <div data-workspace-reveal className="shrink-0">
        <WorkspaceHeader
          problem={problem}
          selectedLanguage={language}
          onLanguageChange={handleLanguageChange}
          onRun={handleRun}
          onSubmit={handleSubmit}
          onReset={() => setShowResetModal(true)}
          isEvaluating={isEvaluating}
          aiEnabled={aiEnabled}
          onToggleAi={() => setAiEnabled(!aiEnabled)}
        />
      </div>

      {/* Mobile Tab Bar */}
      <div
        data-workspace-reveal
        className="flex md:hidden border-b border-rule bg-paper-2/70 px-2 py-1 justify-around text-xs"
      >
        <button
          onClick={() => setMobileTab("description")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono uppercase tracking-wide ${
            mobileTab === "description"
              ? "bg-ink text-paper"
              : "text-ink-3"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Description</span>
        </button>
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono uppercase tracking-wide ${
            mobileTab === "editor" ? "bg-ink text-paper" : "text-ink-3"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setMobileTab("console")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono uppercase tracking-wide ${
            mobileTab === "console" ? "bg-ink text-paper" : "text-ink-3"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Verdict</span>
        </button>
      </div>

      {/* Main Workspace Body */}
      <div data-workspace-reveal className="flex-1 overflow-hidden">
        {/* Desktop Split-Pane Layout */}
        <div className="hidden md:block h-full">
          <Resizable direction="horizontal" initialSize={42} minSize={280}>
            {/* Left Panel: Description or Submissions */}
            <div className="h-full flex flex-col bg-paper border-r border-rule overflow-hidden">
              <div className="px-3 border-b border-rule bg-paper-2/60">
                <Tabs
                  tabs={[
                    {
                      id: "description",
                      label: "Description",
                      icon: <FileText className="w-3.5 h-3.5" />,
                    },
                    {
                      id: "submissions",
                      label: "Submissions",
                      icon: <History className="w-3.5 h-3.5" />,
                      count: submissions.length,
                    },
                  ]}
                  activeTab={leftTab}
                  onChange={(tab) => {
                    setLeftTab(tab);
                    if (tab === "submissions" && id) {
                      const effectiveUserId = user?.userId || (user as any)?.id;
                      const latest = submissionService.getProblemSubmissions(id, effectiveUserId);
                      setSubmissions(latest);
                    }
                  }}
                  variant="underline"
                  className="border-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto">
                {leftTab === "description" ? (
                  <ProblemDescription problem={problem} />
                ) : (
                  <SubmissionHistoryTab
                    submissions={submissions}
                    isLoading={isEvaluating}
                  />
                )}
              </div>
            </div>

            {/* Right Panel: Split between Code Editor and Output Console */}
            <div className="h-full flex flex-col overflow-hidden">
              <Resizable direction="vertical" initialSize={65} minSize={150}>
                {/* Right Top: Monaco Code Editor */}
                <div className="h-full overflow-hidden flex flex-col">
                  <CodeEditorPane
                    value={currentCode}
                    onChange={handleCodeChange}
                    language={language}
                    aiEnabled={aiEnabled}
                  />
                </div>

                {/* Right Bottom: Output Console */}
                <div className="h-full overflow-hidden flex flex-col">
                  <OutputConsole
                    problem={problem}
                    result={executionResult}
                    isEvaluating={isEvaluating}
                    runOutput={runOutput}
                  />
                </div>
              </Resizable>
            </div>
          </Resizable>
        </div>

        {/* Mobile View Mode */}
        <div className="block md:hidden h-full overflow-y-auto">
          {mobileTab === "description" && (
            <div className="p-3">
              <ProblemDescription problem={problem} />
            </div>
          )}
          {mobileTab === "editor" && (
            <div className="h-full flex flex-col">
              <CodeEditorPane
                value={currentCode}
                onChange={handleCodeChange}
                language={language}
                aiEnabled={aiEnabled}
              />
            </div>
          )}
          {mobileTab === "console" && (
            <div className="h-full">
              <OutputConsole
                problem={problem}
                result={executionResult}
                isEvaluating={isEvaluating}
                runOutput={runOutput}
              />
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Code Template?"
        description="Are you sure you want to reset your editor code? This will discard your current changes for this language."
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleResetCode}>
            Reset Code
          </Button>
        </div>
      </Modal>

      {/* Auth Modal for Unauthenticated Users */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign In to Submit Solutions"
        description="To run submissions against the sandboxed Docker judge and record verdicts, please sign in or register."
      >
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowAuthModal(false);
              navigate("/login");
            }}
          >
            Go to Sign In
          </Button>
        </div>
      </Modal>
    </div>
  );
};
