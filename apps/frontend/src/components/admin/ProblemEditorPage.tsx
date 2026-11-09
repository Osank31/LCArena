/**
 * ProblemEditorPage — admin page for creating and editing problems.
 *
 * Routes:
 *   /admin/problems/create        — new problem
 *   /admin/problems/:id/edit      — edit existing problem (prefilled via API)
 *
 * Admin RBAC is enforced at the gateway; this page additionally guards on
 * the authenticated user's role being "Admin".
 */

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ProblemEditor } from "./ProblemEditor";
import { problemService } from "../../services/problemService";
import { IProblem } from "../../types/problem.types";

export const ProblemEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [initial, setInitial] = useState<IProblem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Admin guard: only Admins may create/edit problems.
  if (user?.userRole !== "Admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-6">
        <h1 className="font-serif text-2xl font-bold text-ink mb-2">
          Admin access required
        </h1>
        <p className="text-ink-3">
          You must be an Administrator to create or edit problems.
        </p>
      </div>
    );
  }

  // Fetch existing problem when in edit mode.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!id || id === "create") {
        setInitial(null);
        setLoading(false);
        return;
      }
      try {
        const problem = await problemService.getProblemById(id);
        if (isMounted) {
          setInitial({
            _id: problem.id,
            description: problem.rawDescription,
            difficulty: problem.difficulty,
            sampleTestCaseUrl: problem.sampleTestCaseUrl,
            testCasesUrl: problem.testCasesUrl,
            time_limit: problem.timeLimit,
            title: problem.title,
            slug: problem.slug,
            tags: problem.tags,
          });
        }
      } catch {
        if (isMounted) setInitial(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSave = useCallback(
    async (payload: {
      _id?: string;
      description: string;
      difficulty: "Easy" | "Medium" | "Hard";
      sampleTestCaseUrl: string;
      testCasesUrl: string;
      time_limit: number;
      title?: string;
      slug?: string;
      tags?: string[];
    }) => {
      setSaving(true);
      try {
        if (id && id !== "create") {
          await fetch(`/api/problems/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          await fetch("/api/problems", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
        navigate(id && id !== "create" ? `/problems/${id}` : "/problems");
      } catch (err: any) {
        console.error("Failed to save problem:", err);
      } finally {
        setSaving(false);
      }
    },
    [id, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate("/problems");
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-6">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink mb-4"></span>
        <p className="text-ink-3">Loading problem…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="px-6 py-4 border-b border-rule bg-paper-2 flex items-center justify-between">
        <h1 className="font-serif text-xl font-bold text-ink">
          {id && id !== "create" ? "Edit Problem" : "Create Problem"}
        </h1>
        <button
          onClick={handleCancel}
          className="px-4 py-2 rounded-sm text-ink-2 bg-paper-3 border border-rule hover:bg-paper-2 transition"
        >
          Back to Problems
        </button>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <ProblemEditor
          initial={initial}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={saving}
        />
      </main>
    </div>
  );
};
