import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import axios from "axios";
import { Minus, Plus } from "lucide-react";
import { SupportedLanguage } from "../../types/submission.types";

interface CodeEditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  aiEnabled?: boolean;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
}

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  cpp: "cpp",
  py: "python",
  java: "java",
  js: "javascript",
};

export const FONT_SIZE_STORAGE_KEY = "lcarena_editor_font_size";
export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 32;

export const CodeEditorPane: React.FC<CodeEditorPaneProps> = ({
  value,
  onChange,
  language,
  aiEnabled = false,
  fontSize: controlledFontSize,
  onFontSizeChange,
}) => {
  const monacoLang = LANGUAGE_MAP[language] || "plaintext";
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced AI completion request
  const fetchSuggestions = useCallback(
    async (code: string, offset: number) => {
      if (!aiEnabled) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const prefix = code.slice(0, offset);
        const suffix = code.slice(offset);

        await axios.post(
          "/suggestions",
          {
            prefix,
            suffix,
            language_id: monacoLang,
            cursor_position: { row: 1, col: 1 },
          },
          { signal: controller.signal }
        );
      } catch (err) {
        if (!axios.isCancel(err)) {
          // Ignore suggestion errors gracefully
        }
      }
    },
    [aiEnabled, monacoLang]
  );

  const handleEditorMount: OnMount = (editor) => {
    editor.onDidChangeCursorPosition((e) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        const offset = model.getOffsetAt(e.position);
        fetchSuggestions(model.getValue(), offset);
      }, 500);
    });
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div
      className="w-full h-full relative bg-[#1e1e1e] flex flex-col"
      data-testid="code-editor-container"
    >
      {/* Editor top toolbar with font size controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-slate-800 text-xs text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-slate-300 uppercase">
            {monacoLang}
          </span>
        </div>

        {/* Font size increase / decrease buttons */}
        <div
          className="flex items-center gap-1"
          data-testid="editor-font-size-controls"
        >
          <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">
            Font Size:
          </span>
          <button
            onClick={handleDecreaseFontSize}
            disabled={currentFontSize <= MIN_FONT_SIZE}
            title="Decrease font size"
            aria-label="Decrease font size"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-700"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetFontSize}
            title="Reset font size to default (13px)"
            aria-label="Reset font size"
            className="text-[11px] font-mono px-1.5 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {currentFontSize}px
          </button>
          <button
            onClick={handleIncreaseFontSize}
            disabled={currentFontSize >= MAX_FONT_SIZE}
            title="Increase font size"
            aria-label="Increase font size"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={monacoLang}
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val || "")}
          onMount={handleEditorMount}
          options={{
            fontSize: currentFontSize,
            mouseWheelZoom: true,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            lineNumbers: "on",
            renderWhitespace: "selection",
            suggestOnTriggerCharacters: true,
            formatOnPaste: true,
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
