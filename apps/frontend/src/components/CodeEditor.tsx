import { Editor } from "@monaco-editor/react";
import { useRef, useState } from "react";
import LanguageSelector from "./LanguageSelector";

const CodeEditor = () => {
    const editorRef = useRef(null);

    const onMount = (editor: any) => {
        editorRef.current = editor;
        editor.focus();
    }

    const onSelect = (language: string) => {
        setLanguage(language);
    }

    const [value, setValue] = useState('');
    const [language, setLanguage] = useState('javascript');

    return (
        <div className="">
            <LanguageSelector language={language} onSelect={onSelect}/>
            <Editor
                height="45vh"
                language={language}
                theme="vs-dark"
                value={value}
                onChange={(value) => setValue(value || '')}
                onMount={onMount}
            />
        </div>
    )
}

export default CodeEditor;