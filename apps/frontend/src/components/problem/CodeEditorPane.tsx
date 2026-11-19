import React, { useEffect, useRef, useState } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import axios from 'axios';
import {
    AlertCircle,
    Check,
    Copy,
    CornerDownLeft,
    Loader2,
    Minus,
    Plus,
    Sparkles,
    X,
} from 'lucide-react';
import { SupportedLanguage } from '../../types/submission.types';

interface CodeEditorPaneProps {
    value: string;
    onChange: (value: string) => void;
    language: SupportedLanguage;
    aiEnabled?: boolean;
    fontSize?: number;
    onFontSizeChange?: (size: number) => void;
}

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
    cpp: 'cpp',
    py: 'python',
    java: 'java',
    js: 'javascript',
};

/**
 * Base URL for the AI suggestion service. Follows the same env-driven pattern
 * as `apiClient`: empty in dev (the Vite proxy handles `/suggestions`), and
 * settable at build time via `VITE_AI_URL` when the app is deployed on an
 * origin where the AI service is not reachable under the same host.
 */
const AI_BASE_URL = import.meta.env.VITE_AI_URL || import.meta.env.VITE_API_URL || '';

export const FONT_SIZE_STORAGE_KEY = 'lcarena_editor_font_size';
export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 32;

/** Monaco theme id for the paper/book look. */
export const PAPER_EDITOR_THEME = 'lcarena-paper';

/**
 * Paper-toned Monaco theme. Reuses the design-system palette so the editor
 * background matches the page (`#F4EBDD`) and every token stays near-black,
 * with only small tonal differences to preserve syntax readability.
 */
export const definePaperEditorTheme: BeforeMount = (monaco) => {
    monaco.editor.defineTheme(PAPER_EDITOR_THEME, {
        base: 'vs',
        inherit: true,
        rules: [
            { token: '', foreground: '211E19' },
            { token: 'comment', foreground: '7A7264', fontStyle: 'italic' },
            { token: 'keyword', foreground: '211E19', fontStyle: 'bold' },
            { token: 'keyword.control', foreground: '211E19', fontStyle: 'bold' },
            { token: 'operator', foreground: '4A4238' },
            { token: 'string', foreground: '4A4238' },
            { token: 'string.escape', foreground: '3D382F' },
            { token: 'number', foreground: '2E2A24' },
            { token: 'type', foreground: '2E2A24' },
            { token: 'type.identifier', foreground: '2E2A24' },
            { token: 'function', foreground: '26221C' },
            { token: 'identifier', foreground: '34302A' },
            { token: 'variable', foreground: '34302A' },
            { token: 'constant', foreground: '211E19' },
            { token: 'delimiter', foreground: '5A5246' },
            { token: 'delimiter.bracket', foreground: '211E19' },
            { token: 'tag', foreground: '211E19', fontStyle: 'bold' },
            { token: 'attribute.name', foreground: '4A4238' },
        ],
        colors: {
            'editor.background': '#F4EBDD',
            'editor.foreground': '#211E19',
            'editorGutter.background': '#F4EBDD',
            'editorLineNumber.foreground': '#A99E8A',
            'editorLineNumber.activeForeground': '#211E19',
            'editor.lineHighlightBackground': '#EAE0CF',
            'editor.lineHighlightBorder': '#00000000',
            'editor.selectionBackground': '#D8CBB5',
            'editor.inactiveSelectionBackground': '#E8DDC9',
            'editor.selectionHighlightBackground': '#E8DDC9',
            'editorCursor.foreground': '#211E19',
            'editorWhitespace.foreground': '#C6B79C',
            'editorIndentGuide.background1': '#DED2BE',
            'editorIndentGuide.activeBackground1': '#B9A98C',
            'editorBracketMatch.background': '#D8CBB5',
            'editorBracketMatch.border': '#C6B79C',
            'editorError.foreground': '#211E19',
            'editorWarning.foreground': '#6B6151',
            'editorInfo.foreground': '#6B6151',
            'editorHint.foreground': '#6B6151',
            // Widgets: suggestions, hovers, find
            'editorWidget.background': '#EFE7D8',
            'editorWidget.foreground': '#211E19',
            'editorWidget.border': '#D8CBB5',
            'editorSuggestWidget.background': '#EFE7D8',
            'editorSuggestWidget.border': '#D8CBB5',
            'editorSuggestWidget.foreground': '#211E19',
            'editorSuggestWidget.selectedBackground': '#D8CBB5',
            'editorSuggestWidget.selectedForeground': '#211E19',
            'editorSuggestWidget.highlightForeground': '#211E19',
            'editorSuggestWidget.focusHighlightForeground': '#211E19',
            'editorHoverWidget.background': '#EFE7D8',
            'editorHoverWidget.border': '#D8CBB5',
            'editorHoverWidget.foreground': '#211E19',
            'editorHoverWidget.statusBarBackground': '#E8DDC9',
            // Inputs & dropdowns inside widgets
            'input.background': '#F4EBDD',
            'input.border': '#D8CBB5',
            'input.foreground': '#211E19',
            'input.placeholderForeground': '#6B6151',
            'dropdown.background': '#EFE7D8',
            'dropdown.border': '#D8CBB5',
            'dropdown.foreground': '#211E19',
            'list.hoverBackground': '#E8DDC9',
            'list.focusBackground': '#D8CBB5',
            'list.activeSelectionBackground': '#D8CBB5',
            'list.activeSelectionForeground': '#211E19',
            'list.highlightForeground': '#211E19',
            'list.inactiveSelectionBackground': '#E8DDC9',
            'menu.background': '#EFE7D8',
            'menu.foreground': '#211E19',
            'menu.selectionBackground': '#D8CBB5',
            'menu.selectionForeground': '#211E19',
            'menu.border': '#D8CBB5',
            'menu.separatorBackground': '#D8CBB5',
            // Find / replace widget
            editorFindMatchHighlight: '#D8CBB5',
            'editor.findMatchBackground': '#C6B79C',
            'editor.findMatchBorder': '#211E19',
            // Minimap & scrollbar
            'minimap.background': '#F4EBDD',
            'scrollbar.shadow': '#00000000',
            'scrollbarSlider.background': '#D8CBB580',
            'scrollbarSlider.hoverBackground': '#C6B79C99',
            'scrollbarSlider.activeBackground': '#C6B79CAF',
            // Overview ruler
            'editorOverviewRuler.border': '#00000000',
        },
    });
};

export const CodeEditorPane: React.FC<CodeEditorPaneProps> = ({
    value,
    onChange,
    language,
    aiEnabled = false,
    fontSize: controlledFontSize,
    onFontSizeChange,
}) => {
    const monacoLang = LANGUAGE_MAP[language] || 'plaintext';
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);

    // AI suggestion states (button-driven, zero background typing calls)
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
    const [suggestionMeta, setSuggestionMeta] = useState<{
        model?: string;
        tokens?: number;
        latencyMs?: number;
    } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Manage internal font size state synced with localStorage
    const [internalFontSize, setInternalFontSize] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
                    return parsed;
                }
            }
        } catch {
            // Storage error fallback
        }
        return DEFAULT_FONT_SIZE;
    });

    const currentFontSize = controlledFontSize ?? internalFontSize;

    const updateFontSize = (newSize: number) => {
        const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
        setInternalFontSize(clamped);
        try {
            localStorage.setItem(FONT_SIZE_STORAGE_KEY, clamped.toString());
        } catch {
            // Ignore storage errors
        }
        if (onFontSizeChange) {
            onFontSizeChange(clamped);
        }
    };

    const handleIncreaseFontSize = () => {
        updateFontSize(currentFontSize + 1);
    };

    const handleDecreaseFontSize = () => {
        updateFontSize(currentFontSize - 1);
    };

    const handleResetFontSize = () => {
        updateFontSize(DEFAULT_FONT_SIZE);
    };

    // User-triggered AI Suggestion request via UI button (no unprompted token consumption)
    const handleFetchAiSuggestion = async () => {
        setIsGenerating(true);
        setAiError(null);
        setActiveSuggestion(null);

        try {
            let code = value;
            let row = 0;
            let col = 0;
            let prefix = code;
            let suffix = '';

            if (editorRef.current) {
                const model = editorRef.current.getModel();
                const position = editorRef.current.getPosition();
                if (model && position) {
                    code = model.getValue();
                    const offset = model.getOffsetAt(position);
                    prefix = code.slice(0, offset);
                    suffix = code.slice(offset);
                    row = position.lineNumber - 1;
                    col = position.column - 1;
                }
            }

            if (!code.trim()) {
                setAiError('Please write some code before requesting a suggestion.');
                setIsGenerating(false);
                return;
            }

            const response = await axios.post(`${AI_BASE_URL}/suggestions`, {
                prefix,
                suffix,
                language_id: monacoLang,
                cursor_position: {
                    row: Math.max(0, row),
                    col: Math.max(0, col),
                },
                editor_info: 'LCArena-Monaco',
            });

            const choices = response.data?.choices || [];
            if (choices.length > 0 && choices[0]?.insert_text) {
                setActiveSuggestion(choices[0].insert_text);
                setSuggestionMeta({
                    model: response.data?.model,
                    tokens: response.data?.usage?.total_tokens,
                    latencyMs: response.data?.latency_ms,
                });
            } else {
                setAiError(
                    'No suggestion could be generated for the current context. Try adding more code context or positioning the cursor.',
                );
            }
        } catch (err: any) {
            setAiError(
                err.response?.data?.detail ||
                    'Failed to generate AI suggestion. Please check your network connection.',
            );
        } finally {
            setIsGenerating(false);
        }
    };

    // User button: Insert suggestion into code editor at the current cursor position
    const handleInsertAtCursor = () => {
        if (!activeSuggestion) return;

        if (editorRef.current && monacoRef.current) {
            const position = editorRef.current.getPosition() || { lineNumber: 1, column: 1 };
            const selection = editorRef.current.getSelection();
            const range =
                selection && !selection.isEmpty()
                    ? selection
                    : new monacoRef.current.Range(
                          position.lineNumber,
                          position.column,
                          position.lineNumber,
                          position.column,
                      );

            editorRef.current.executeEdits('ai-suggestion', [
                {
                    range,
                    text: activeSuggestion,
                    forceMoveMarkers: true,
                },
            ]);
            editorRef.current.focus();
        } else {
            onChange(value + (value.endsWith('\n') ? '' : '\n') + activeSuggestion);
        }
        setActiveSuggestion(null);
    };

    // User button: Copy suggestion to clipboard
    const handleCopySuggestion = async () => {
        if (!activeSuggestion) return;
        try {
            await navigator.clipboard.writeText(activeSuggestion);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // Clipboard fallback
        }
    };

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    return (
        <div
            className="w-full h-full relative bg-paper flex flex-col"
            data-testid="code-editor-container"
        >
            {/* Editor top toolbar with AI Suggestion Button and Font Size Controls */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-paper-2 border-b border-rule text-xs text-ink-3 select-none shrink-0">
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ink-2 font-semibold">
                        {monacoLang}
                    </span>

                    {/* Button-driven AI Suggestion Trigger (zero unprompted token cost) */}
                    <button
                        onClick={handleFetchAiSuggestion}
                        disabled={isGenerating}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono transition cursor-pointer border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            aiEnabled
                                ? 'bg-ink text-paper border-ink hover:bg-ink-2'
                                : 'bg-paper text-ink border-rule-2 hover:border-ink hover:bg-paper-3'
                        }`}
                        title="Click to generate an AI code suggestion based on current code"
                        aria-label="Get AI Suggestion"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Thinking...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Get AI Suggestion</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Font size increase / decrease buttons */}
                <div className="flex items-center gap-1" data-testid="editor-font-size-controls">
                    <span className="text-[11px] text-ink-3 mr-1 hidden sm:inline font-mono">
                        Font Size:
                    </span>
                    <button
                        onClick={handleDecreaseFontSize}
                        disabled={currentFontSize <= MIN_FONT_SIZE}
                        title="Decrease font size"
                        aria-label="Decrease font size"
                        className="p-1 rounded-sm text-ink-3 hover:text-ink hover:bg-paper-3 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-90 cursor-pointer border border-transparent hover:border-rule-2"
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleResetFontSize}
                        title="Reset font size to default (13px)"
                        aria-label="Reset font size"
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm text-ink-2 hover:text-ink hover:bg-paper-3 transition cursor-pointer"
                    >
                        {currentFontSize}px
                    </button>
                    <button
                        onClick={handleIncreaseFontSize}
                        disabled={currentFontSize >= MAX_FONT_SIZE}
                        title="Increase font size"
                        aria-label="Increase font size"
                        className="p-1 rounded-sm text-ink-3 hover:text-ink hover:bg-paper-3 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-90 cursor-pointer border border-transparent hover:border-rule-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* AI Suggestion Display Panel (with dedicated Insert, Copy & Dismiss buttons) */}
            {activeSuggestion && (
                <div
                    className="bg-paper-2 border-b border-rule px-3.5 py-2.5 flex flex-col gap-2 shrink-0 shadow-xs"
                    data-testid="ai-suggestion-panel"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-ink-2" />
                            <span className="font-mono text-xs font-semibold text-ink">
                                AI Suggestion
                            </span>
                            {suggestionMeta?.model && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-paper-3 text-ink-3 border border-rule-2">
                                    {suggestionMeta.model}
                                </span>
                            )}
                            {suggestionMeta?.latencyMs !== undefined && (
                                <span className="text-[10px] font-mono text-ink-3">
                                    {suggestionMeta.latencyMs}ms
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setActiveSuggestion(null)}
                            className="text-ink-3 hover:text-ink p-1 rounded hover:bg-paper-3 transition cursor-pointer"
                            title="Dismiss suggestion"
                            aria-label="Dismiss suggestion"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Suggestion Code Preview */}
                    <pre className="font-mono text-xs bg-paper-3 border border-rule-2 rounded p-2.5 text-ink overflow-x-auto max-h-36 whitespace-pre leading-relaxed">
                        <code>{activeSuggestion}</code>
                    </pre>

                    {/* Action Buttons to Insert or Copy the suggestion */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] font-mono text-ink-3 hidden sm:inline">
                            Review suggestion and click Insert to apply to your code.
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={handleCopySuggestion}
                                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-ink-2 bg-paper-3 border border-rule hover:border-ink hover:text-ink transition cursor-pointer active:scale-95"
                                title="Copy code to clipboard"
                            >
                                {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-green-700" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <button
                                onClick={handleInsertAtCursor}
                                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono text-paper bg-ink hover:bg-ink-2 border border-ink transition cursor-pointer active:scale-95 font-semibold"
                                title="Insert this code at cursor position"
                            >
                                <CornerDownLeft className="w-3.5 h-3.5" />
                                <span>Insert at Cursor</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message if AI generation fails */}
            {aiError && (
                <div className="bg-paper-3 border-b border-rule px-3 py-2 flex items-center justify-between text-xs text-ink-2 font-mono shrink-0">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-ink" />
                        <span>{aiError}</span>
                    </div>
                    <button
                        onClick={() => setAiError(null)}
                        className="text-ink-3 hover:text-ink p-1 rounded transition cursor-pointer"
                        title="Dismiss error"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <Editor
                    height="100%"
                    language={monacoLang}
                    theme={PAPER_EDITOR_THEME}
                    beforeMount={definePaperEditorTheme}
                    value={value}
                    onChange={(val) => onChange(val || '')}
                    onMount={handleEditorMount}
                    options={{
                        fontSize: currentFontSize,
                        mouseWheelZoom: true,
                        fontFamily:
                            '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        lineNumbers: 'on',
                        renderWhitespace: 'selection',
                        suggestOnTriggerCharacters: true,
                        formatOnPaste: true,
                        fixedOverflowWidgets: true,
                    }}
                />
            </div>

            {/* Accessible textarea fallback for automated testing environments */}
            <textarea
                aria-label="Code Editor Input"
                data-testid="code-editor-textarea"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
                tabIndex={-1}
            />
        </div>
    );
};
