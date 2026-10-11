import React, { useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import axios from "axios";
import { SupportedLanguage } from "../../types/submission.types";

interface CodeEditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  language: SupportedLanguage;
  aiEnabled?: boolean;
}

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  cpp: "cpp",
  py: "python",
  java: "java",
  js: "javascript",
};

export const CodeEditorPane: React.FC<CodeEditorPaneProps> = ({
  value,
  onChange,
  language,
  aiEnabled = false,
}) => {
  const monacoLang = LANGUAGE_MAP[language] || "plaintext";
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={monacoLang}
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange(val || "")}
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
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
