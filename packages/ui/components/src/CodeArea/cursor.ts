export type CursorPosition = {
    row: number
    col: number
}

export const getCursorPosition = (
    textarea: HTMLTextAreaElement
): CursorPosition => {
    const cursor = textarea.selectionStart

    const textBeforeCursor = textarea.value.substring(0, cursor)

    const lineParts = textBeforeCursor.split("\n")

    const row = lineParts.length

    const col =
        lineParts[lineParts.length - 1].length + 1

    return {
        row,
        col,
    }
}
