import { Editor } from "@monaco-editor/react";
import { useRef, useState, useCallback, useEffect } from "react";
import LanguageSelector from "./LanguageSelector";
import type { editor } from "monaco-editor";
import axios from "axios";

type getSuggestionsParams = {
    prefix: string,
    suffix: string,
    language_id: string,
    cursor_position: { row: number, col: number },
    editor_info?: string
}

const DEBOUNCE_MS = 400;

const CodeEditor = () => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [value, setValue] = useState('');
    const [language, setLanguage] = useState('javascript');

    const getSuggestions = async (_params: getSuggestionsParams) => {
        void _params;
        // Cancel any in-flight request — its result is stale now anyway
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // const response = await axios.post('http://localhost:8000/suggestions',
            //     {
            //         prefix: params.prefix,
            //         suffix: params.suffix,
            //         language_id: params.language_id,
            //         cursor_position: params.cursor_position,
            //         editor_info: params?.editor_info
            //     },
            //     { signal: controller.signal }
            // )

            // console.log('Suggestions:', response.data);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled (superseded by newer keystroke)');
                return;
            }
            console.error('Error fetching suggestions:', error);
        }
    }

    const handleCodeChange = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
        // Clear any pending debounced call — the user is still typing
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            const model = editorInstance.getModel();
            const position = editorInstance.getPosition();
            if (!model || !position) return;

            const offset = model.getOffsetAt(position);
            const code = model.getValue();

            const beforeCursor = code.slice(0, offset);
            const afterCursor = code.slice(offset);

            getSuggestions({
                prefix: beforeCursor,
                suffix: afterCursor,
                language_id: language,
                cursor_position: { row: position.lineNumber, col: position.column },
            });
        }, DEBOUNCE_MS);
    }, [language]);

    const onMount = (editorInstance: editor.IStandaloneCodeEditor) => {
        editorRef.current = editorInstance;
        editorInstance.focus();

        editorInstance.onDidChangeModelContent(() => {
            handleCodeChange(editorInstance);
        });
    }

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            abortControllerRef.current?.abort();
        };
    }, []);

    const onSelect = (lang: string) => {
        setLanguage(lang);
    }

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <LanguageSelector language={language} onSelect={onSelect} />
            <div style={{ flex: 1, overflow: "hidden" }}>
                <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={value}
                    options={{ automaticLayout: true }}
                    onChange={(v) => setValue(v || '')}
                    onMount={onMount}
                />
            </div>
        </div>
    )
}

export default CodeEditor;