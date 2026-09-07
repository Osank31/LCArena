import type { ComponentProps } from "react"
import { useRef } from "react"
import { useCodeEditor } from "./useCodeEditor"
import Prism from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-python"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-java"

type CodeAreaProps =
    ComponentProps<"textarea"> & {
        onCursorPositionChange?: (
            position: {
                row: number
                col: number
            }
        ) => void

        language?:
            | "cpp"
            | "python"
            | "javascript"
            | "java"
    }

export const CodeArea = ({
    value,
    defaultValue,
    onChange,
    onCursorPositionChange,
    className,
    language = "cpp",
    ...props
}: CodeAreaProps) => {

    const {
        code,
        cursorPosition,
        handleChange,
        handleKeyDown,
        handleCursorChange,
    } = useCodeEditor({
        value: String(value ?? ""),
        defaultValue: String(defaultValue ?? ""),
        language,
        onChange,
        onCursorPositionChange,
    })

    const lines = code.split("\n").length

    const preRef = useRef<HTMLPreElement>(null)

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (preRef.current) {
            preRef.current.scrollTop = e.currentTarget.scrollTop
            preRef.current.scrollLeft = e.currentTarget.scrollLeft
        }
    }

    const highlightCode = () => {
        const prismLang = Prism.languages[language] || Prism.languages.javascript
        return Prism.highlight(code || "", prismLang, language)
    }

    return (
        <div className="w-full">

            <div
                className="
                    flex
                    w-full
                    overflow-hidden
                    rounded-md
                    border
                    bg-transparent
                    shadow-xs
                "
            >

                {/* Line numbers */}

                <div
                    className="
                        select-none
                        bg-gray-100
                        px-3
                        py-2
                        text-right
                        font-mono
                        text-sm
                        leading-6
                        text-gray-500
                    "
                >
                    {Array.from(
                        { length: lines },
                        (_, i) => (
                            <div key={i}>
                                {i + 1}
                            </div>
                        )
                    )}
                </div>

                {/* Textarea Wrapper */}

                <div className="relative flex-1 min-h-16 bg-transparent">
                    <pre
                        ref={preRef}
                        aria-hidden="true"
                        className={`
                            absolute
                            inset-0
                            !m-0
                            !px-2.5
                            !py-2
                            !bg-transparent
                            !border-0
                            pointer-events-none
                            overflow-hidden
                            whitespace-pre-wrap
                            break-words
                            !font-mono
                            !text-sm
                            !leading-6
                            ${className ?? ""}
                        `}
                        style={{ tabSize: 4 }}
                    >
                        <code
                            className={`language-${language} !font-mono !text-sm !leading-6 !bg-transparent`}
                            dangerouslySetInnerHTML={{ __html: highlightCode() + "\n" }}
                        />
                    </pre>

                    <textarea
                        data-slot="code-area"
                        value={code}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onClick={handleCursorChange}
                        onKeyUp={handleCursorChange}
                        onSelect={handleCursorChange}
                        onScroll={handleScroll}
                        spellCheck={false}
                        className={`
                            absolute
                            inset-0
                            block
                            w-full
                            h-full
                            resize-none
                            bg-transparent
                            text-transparent
                            caret-black
                            dark:caret-white
                            px-2.5
                            py-2
                            font-mono
                            text-sm
                            leading-6
                            outline-none
                            placeholder:text-gray-500
                            focus:ring-0
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            whitespace-pre-wrap
                            break-words
                            ${className ?? ""}
                        `}
                        style={{
                            WebkitTextFillColor: "transparent",
                            tabSize: 4,
                            ...props.style
                        }}
                        {...props}
                    />
                </div>

            </div>

            {/* Cursor position */}

            <div
                className="
                    mt-1
                    font-mono
                    text-xs
                    text-gray-500
                "
            >
                Ln {cursorPosition.row},
                Col {cursorPosition.col}
            </div>

        </div>
    )
}
