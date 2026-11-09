/**
 * ProblemEditor — admin create/edit interface for problem descriptions.
 *
 * Two-pane layout:
 *   Left: raw Markdown editor (textarea) — the raw Markdown is preserved
 *         exactly during editing; no transformation until save.
 *   Right: live preview using the shared MarkdownRenderer — preview and
 *          saved output are consistent because both render the same source.
 *
 * Validation runs before save: description must be at least 10 characters,
 * and a warning is shown for unbalanced fenced code blocks (never blocks
 * saving — the user decides).
 *
 * Cancel restores the raw Markdown from local state (no server round-trip
 * until the user explicitly saves).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { extractTitle, extractSlug, extractTags, hasBalancedFences } from '../../lib/markdown';

interface ProblemEditorProps {
    /** Initial problem (for edit mode) or undefined (create mode). */
    initial?: {
        _id: string;
        description: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        sampleTestCaseUrl: string;
        testCasesUrl: string;
        time_limit: number;
        title?: string;
        slug?: string;
        tags?: string[];
    } | null;
    /** Called when the user saves: receives the full problem payload. */
    onSave: (payload: {
        _id?: string;
        description: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        sampleTestCaseUrl: string;
        testCasesUrl: string;
        time_limit: number;
        title?: string;
        slug?: string;
        tags?: string[];
    }) => void;
    /** Called when the user cancels. */
    onCancel: () => void;
    /** Whether a save is currently in flight (disables the form). */
    isSaving?: boolean;
}

const DIFFICULTIES: ('Easy' | 'Medium' | 'Hard')[] = ['Easy', 'Medium', 'Hard'];

export const ProblemEditor: React.FC<ProblemEditorProps> = ({
    initial,
    onSave,
    onCancel,
    isSaving = false,
}) => {
    const [isEdit, setIsEdit] = useState<boolean>(!!initial);
    const [form, setForm] = useState<{
        _id: string;
        description: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        sampleTestCaseUrl: string;
        testCasesUrl: string;
        time_limit: number;
        title: string;
        slug: string;
        tags: string[];
    }>({
        _id: '',
        description: '',
        difficulty: 'Easy',
        sampleTestCaseUrl: '',
        testCasesUrl: '',
        time_limit: 5000,
        title: '',
        slug: '',
        tags: [],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [warnings, setWarnings] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Initialize form from initial problem (create mode starts empty).
    useEffect(() => {
        if (initial) {
            setIsEdit(true);
            setForm({
                _id: initial._id,
                description: initial.description,
                difficulty: initial.difficulty,
                sampleTestCaseUrl: initial.sampleTestCaseUrl,
                testCasesUrl: initial.testCasesUrl,
                time_limit: initial.time_limit,
                title: initial.title || extractTitle(initial.description) || '',
                slug: initial.slug || extractSlug(initial.title || '') || '',
                tags: initial.tags ?? extractTags(initial.description),
            });
        } else {
            setIsEdit(false);
            setForm({
                _id: '',
                description: '',
                difficulty: 'Easy',
                sampleTestCaseUrl: '',
                testCasesUrl: '',
                time_limit: 5000,
                title: '',
                slug: '',
                tags: [],
            });
        }
    }, [initial]);

    // Derived title/slug/tags from the raw description as the user types.
    // These are suggestions only — the user can override them.
    useEffect(() => {
        const suggestedTitle = extractTitle(form.description);
        const suggestedSlug = suggestedTitle ? extractSlug(suggestedTitle) : undefined;
        const suggestedTags = extractTags(form.description);
        setForm((prev) => ({
            ...prev,
            title: prev.title || suggestedTitle || '',
            slug: prev.slug || suggestedSlug || '',
            tags: prev.tags.length === 0 ? suggestedTags : prev.tags,
        }));
    }, [form.description]);

    // Validation: description min 10 chars, required URLs, etc.
    const validate = useCallback((): boolean => {
        const next: Record<string, string> = {};
        if (!form.description || form.description.length < 10) {
            next.description = 'Description must be at least 10 characters.';
        }
        if (form.description && form.description.length > 50_000) {
            next.description = 'Description must not exceed 50,000 characters.';
        }
        if (!form.sampleTestCaseUrl) {
            next.sampleTestCaseUrl = 'Sample test case URL is required.';
        }
        if (!form.testCasesUrl) {
            next.testCasesUrl = 'Test cases URL is required.';
        }
        if (!form.difficulty) {
            next.difficulty = 'Difficulty is required.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }, [form.description, form.sampleTestCaseUrl, form.testCasesUrl, form.difficulty]);

    // Warnings: never block save, just inform.
    useEffect(() => {
        const next: Record<string, string> = {};
        if (form.description && !hasBalancedFences(form.description)) {
            next.fences =
                'Unbalanced fenced code blocks detected. Preview may look off until fixed.';
        }
        setWarnings(next);
    }, [form.description]);

    const handleChange = useCallback((key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setSubmitError(null);
    }, []);

    const handleTagsChange = useCallback((tags: string[]) => {
        setForm((prev) => ({ ...prev, tags }));
        setSubmitError(null);
    }, []);

    const handleDifficultyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, difficulty: e.target.value as any }));
        setSubmitError(null);
    }, []);

    const handleTimeLimitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({
            ...prev,
            time_limit: Number(e.target.value) || 5000,
        }));
        setSubmitError(null);
    }, []);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            setSubmitError(null);
            if (!validate()) return;

            onSave({
                ...form,
                description: form.description, // raw Markdown preserved exactly
            });
        },
        [form, validate, onSave],
    );

    const handleCancel = useCallback(() => {
        setSubmitError(null);
        setErrors({});
        onCancel();
    }, [onCancel]);

    const hasErrors = Object.keys(errors).length > 0;
    const hasWarnings = Object.keys(warnings).length > 0;

    return (
        <div className="flex flex-col h-full bg-paper text-ink">
            <header className="flex items-center gap-3 px-6 py-4 border-b border-rule bg-paper-2">
                <h2 className="font-serif text-xl font-bold text-ink">
                    {isEdit ? 'Edit Problem' : 'Create Problem'}
                </h2>
                <span
                    className={`px-2 py-0.5 rounded-sm text-xs font-mono ${
                        isEdit
                            ? 'bg-paper-3 text-ink border border-rule'
                            : 'bg-paper-3 text-ink-2 border border-rule'
                    }`}
                >
                    {isEdit ? 'EDIT' : 'CREATE'}
                </span>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left pane: raw Markdown editor */}
                <div className="flex-1 min-w-0 border-r border-rule flex flex-col">
                    <div className="px-6 py-4 bg-paper-2/50 border-b border-rule">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-mono uppercase tracking-wider text-ink-3">
                                Markdown Description
                            </label>
                            <span className="text-[10px] text-ink-3">
                                {form.description.length} / 50,000 chars
                            </span>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full h-full font-mono text-sm text-ink bg-paper p-4 resize-none outline-none"
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            disabled={isSaving}
                            spellCheck={false}
                            data-testid="problem-editor-textarea"
                        />
                        {errors.description && (
                            <p className="pt-2 text-xs text-ink">{errors.description}</p>
                        )}
                        {hasWarnings && (
                            <div className="pt-2 text-xs text-ink-3 bg-paper-3 border border-rule rounded-sm p-2">
                                {Object.values(warnings).join(' ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right pane: live preview */}
                <div className="w-1/2 min-w-0 border-l border-rule flex flex-col">
                    <div className="px-6 py-2 bg-paper-2/50 border-b border-rule">
                        <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
                            Live Preview
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <MarkdownRenderer markdown={form.description} className="max-w-none" />
                    </div>
                </div>
            </div>

            {/* Footer: metadata fields + actions */}
            <footer className="px-6 py-4 border-t border-rule bg-paper-2 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Title
                        </label>
                        <input
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            disabled={isSaving}
                            placeholder="e.g. Two Sum"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Slug
                        </label>
                        <input
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.slug}
                            onChange={(e) => handleChange('slug', e.target.value)}
                            disabled={isSaving}
                            placeholder="e.g. two-sum"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Difficulty
                        </label>
                        <select
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.difficulty}
                            onChange={handleDifficultyChange}
                            disabled={isSaving}
                        >
                            {DIFFICULTIES.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Sample Test Case URL
                        </label>
                        <input
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.sampleTestCaseUrl}
                            onChange={(e) => handleChange('sampleTestCaseUrl', e.target.value)}
                            disabled={isSaving}
                        />
                        {errors.sampleTestCaseUrl && (
                            <p className="pt-1 text-xs text-ink">{errors.sampleTestCaseUrl}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Test Cases URL
                        </label>
                        <input
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.testCasesUrl}
                            onChange={(e) => handleChange('testCasesUrl', e.target.value)}
                            disabled={isSaving}
                        />
                        {errors.testCasesUrl && (
                            <p className="pt-1 text-xs text-ink">{errors.testCasesUrl}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                            Time Limit (ms)
                        </label>
                        <input
                            type="number"
                            className="w-full border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.time_limit}
                            onChange={handleTimeLimitChange}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-ink-3 mb-1">
                        Tags (comma-separated)
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                        <input
                            className="flex-1 border border-rule rounded-sm px-3 py-2 bg-paper text-ink focus:border-rule-2 outline-none"
                            value={form.tags.join(',')}
                            onChange={(e) =>
                                handleTagsChange(
                                    e.target.value
                                        .split(',')
                                        .map((t) => t.trim())
                                        .filter(Boolean),
                                )
                            }
                            disabled={isSaving}
                            placeholder="array, hash-table, string"
                        />
                        {errors.tags && <p className="pt-1 text-xs text-ink">{errors.tags}</p>}
                    </div>
                </div>

                {submitError && (
                    <div className="rounded-sm bg-ink/10 border border-ink px-3 py-2 text-xs text-ink">
                        {submitError}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-sm text-ink-2 bg-paper-3 border border-rule hover:bg-paper-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || hasErrors}
                        className="px-6 py-2 rounded-sm text-paper bg-ink border border-ink hover:bg-paper-2 hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isSaving ? 'Saving…' : isEdit ? 'Update Problem' : 'Create Problem'}
                    </button>
                </div>
            </footer>
        </div>
    );
};
