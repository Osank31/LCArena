import { useEffect, useState } from "react"
import { getCursorPosition } from "./cursor"
import type { CursorPosition } from "./cursor"
import { indentationStrategies } from "./indentation"

export const INDENTATION_SIZE = 4

type Language =
    | "cpp"
    | "python"
    | "javascript"
    | "java"

type UseCodeEditorProps = {
    value?: string
    defaultValue?: string
    language: Language

    onChange?: (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => void

    onCursorPositionChange?: (
        position: CursorPosition
    ) => void
}

export const useCodeEditor = ({
    value,
    defaultValue,
    language,
    onChange,
    onCursorPositionChange,
}: UseCodeEditorProps) => {

    const [code, setCode] = useState(
        String(value ?? defaultValue ?? "")
    )

    const [cursorPosition, setCursorPosition] =
        useState<CursorPosition>({
            row: 1,
            col: 1,
        })

    const strategy =
        indentationStrategies[language]

    // Keep internal code in sync when
    // parent changes the value prop
    useEffect(() => {
        if (value !== undefined) {
            setCode(String(value))
        }
    }, [value])

    // -----------------------------
    // CURSOR POSITION
    // -----------------------------

    const updateCursorPosition = (
        textarea: HTMLTextAreaElement
    ) => {
        const position =
            getCursorPosition(textarea)

        setCursorPosition(position)

        onCursorPositionChange?.(position)
    }

    // -----------------------------
    // NORMAL TYPING
    // -----------------------------

    const handleChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        setCode(e.target.value)

        updateCursorPosition(e.target)

        onChange?.(e)
    }

    // -----------------------------
    // CURSOR MOVEMENT
    // -----------------------------

    const handleCursorChange = (
        e: React.SyntheticEvent<HTMLTextAreaElement>
    ) => {
        updateCursorPosition(e.currentTarget)
    }

    // -----------------------------
    // KEYBOARD HANDLING
    // -----------------------------

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        const textarea = e.currentTarget

        // =========================
        // TAB
        // =========================

        if (e.key === "Tab") {
            e.preventDefault()

            const start =
                textarea.selectionStart

            const end =
                textarea.selectionEnd

            const indentation =
                " ".repeat(INDENTATION_SIZE)

            const newValue =
                code.substring(0, start) +
                indentation +
                code.substring(end)

            setCode(newValue)

            requestAnimationFrame(() => {
                const newCursorPosition =
                    start + indentation.length

                textarea.selectionStart =
                    newCursorPosition

                textarea.selectionEnd =
                    newCursorPosition

                updateCursorPosition(textarea)
            })

            return
        }

        // =========================
        // ENTER
        // =========================

        if (e.key === "Enter") {
            e.preventDefault()

            const cursor =
                textarea.selectionStart

            const beforeCursor =
                code.substring(0, cursor)

            const afterCursor =
                code.substring(cursor)

            // Get current line
            const currentLine =
                beforeCursor
                    .split("\n")
                    .pop() ?? ""

            // Get current indentation
            const indentation =
                currentLine.match(/^\s*/)?.[0] ?? ""

            // Calculate indentation
            // for the next line
            const nextIndentation =
                strategy.getNextIndentation(
                    currentLine,
                    indentation
                )

            const newText =
                "\n" + nextIndentation

            const newValue =
                beforeCursor +
                newText +
                afterCursor

            setCode(newValue)

            requestAnimationFrame(() => {
                const newCursorPosition =
                    cursor + newText.length

                textarea.selectionStart =
                    newCursorPosition

                textarea.selectionEnd =
                    newCursorPosition

                updateCursorPosition(textarea)
            })

            return
        }
    }

    return {
        code,
        cursorPosition,
        handleChange,
        handleKeyDown,
        handleCursorChange,
    }
}
