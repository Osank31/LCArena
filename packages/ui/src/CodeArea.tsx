import * as React from "react"

type CodeAreaProps = React.ComponentProps<"textarea"> & {
    onCursorPositionChange?: (position: {
        row: number
        col: number
    }) => void
}

function CodeArea({
    className,
    value,
    defaultValue,
    onChange,
    onCursorPositionChange,
    ...props
}: CodeAreaProps) {
    const [text, setText] = React.useState(
        String(value ?? defaultValue ?? "")
    )

    const [cursorPosition, setCursorPosition] = React.useState({
        row: 1,
        col: 1,
    })

    // Keep internal text synchronized when used as a controlled component.
    React.useEffect(() => {
        if (value !== undefined) {
            setText(String(value))
        }
    }, [value])

    const lines = text.split("\n").length

    const updateCursorPosition = (
        textarea: HTMLTextAreaElement
    ) => {
        const cursor = textarea.selectionStart
        const textBeforeCursor = textarea.value.substring(0, cursor)

        const lineParts = textBeforeCursor.split("\n")

        const row = lineParts.length
        const col =
            lineParts[lineParts.length - 1].length + 1

        const position = { row, col }

        setCursorPosition(position)
        onCursorPositionChange?.(position)
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
        setText(e.target.value)

        updateCursorPosition(e.target)

        onChange?.(e)
    }

    const handleCursorChange = (
        e: React.SyntheticEvent<HTMLTextAreaElement>
    ) => {
        updateCursorPosition(e.currentTarget)
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
                    value={text}
                    onChange={handleChange}
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

export { CodeArea }
