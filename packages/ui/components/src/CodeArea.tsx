import { ComponentProps, useEffect, useState } from "react"
import { indentationStrategies } from "./indentation"

type CodeAreaProps = ComponentProps<"textarea"> & {
    onCursorPositionChange?: (position: {
        row: number
        col: number
    }) => void,

    language?: "cpp" | "python" | "javascript" | "java"
}

export const INDENTATION_SIZE = 4;

export const CodeArea = ({
    value,
    defaultValue,
    onChange,
    onCursorPositionChange,
    className,
    language = "cpp",
    ...props
}: CodeAreaProps) => {
    const strategy = indentationStrategies[language]

    const [code, setCode] = useState(
        String(value ?? defaultValue ?? "")
    )

    const [cursorPosition, setCursorPosition] = useState({
        row: 1,
        col: 1,
    })

    useEffect(() => {
        if (value !== undefined) {
            setCode(String(value))
        }
    }, [value])

    const lines = code.split("\n").length

    const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
        const cursor = textarea.selectionStart
        const textBeforeCursor = textarea.value.substring(0, cursor)

        const lineParts = textBeforeCursor.split("\n")

        const row = lineParts.length
        const col = lineParts[lineParts.length - 1].length + 1

        const position = { row, col }

        setCursorPosition(position)
        onCursorPositionChange?.(position)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCode(e.target.value)

        updateCursorPosition(e.target)

        onChange?.(e)
    }

    const handleCursorChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        updateCursorPosition(e.currentTarget)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget

        //TAB
        if (e.key === "Tab") {
            e.preventDefault()

            const start = textarea.selectionStart
            const end = textarea.selectionEnd

            const indentation = " ".repeat(INDENTATION_SIZE) // 4 spaces for indentation

            const newValue = code.substring(0, start) + indentation + code.substring(end)

            setCode(newValue)
            
            requestAnimationFrame(() => {
                textarea.selectionStart =  textarea.selectionEnd = start + indentation.length;

                updateCursorPosition(textarea)
            })

            return
        }

        //ENTER
        if (e.key === "Enter") {
            e.preventDefault()

            const cursor = textarea.selectionStart

            const beforeCursor = code.substring(0, cursor)
            const afterCursor = code.substring(cursor)

            const currentLine = beforeCursor.split("\n").pop() ?? ""

            const indentation = currentLine.match(/^\s*/)?.[0] ?? ""

            const nextIndentation = strategy.getNextIndentation(currentLine, indentation)

            const newText =  "\n" + nextIndentation

            const newValue = beforeCursor + newText + afterCursor

            setCode(newValue)

            requestAnimationFrame(() => { 
                const newCursorPosition = cursor + newText.length 
                textarea.selectionStart = newCursorPosition 
                textarea.selectionEnd = newCursorPosition 
                updateCursorPosition(textarea) 
            })
            return
        }


    }

    return (
        <div className="w-full">
            <div className="flex w-full overflow-hidden rounded-md border bg-transparent shadow-xs">
                {/* Line numbers */}
                <div
                    className="
                        select-none
                        bg-gray-100
                        px-3 py-2
                        text-right
                        font-mono text-sm
                        leading-6
                        text-gray-500
                    "
                >
                    {Array.from({ length: lines }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                    ))}
                </div>

                {/* Textarea */}
                <textarea
                    data-slot="code-area"
                    value={code}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onClick={handleCursorChange}
                    onKeyUp={handleCursorChange}
                    onSelect={handleCursorChange}
                    className={`
                        flex-1
                        min-h-16
                        resize-none
                        bg-transparent
                        px-2.5 py-2
                        font-mono text-sm
                        leading-6
                        outline-none
                        placeholder:text-gray-500
                        focus:ring-0
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                        ${className ?? ""}
                    `}
                    {...props}
                />
            </div>

            {/* Current cursor position */}
            <div className="mt-1 font-mono text-xs text-gray-500">
                Ln {cursorPosition.row}, Col {cursorPosition.col}
            </div>
        </div>
    )
}