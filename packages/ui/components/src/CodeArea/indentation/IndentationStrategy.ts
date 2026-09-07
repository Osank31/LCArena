// indentation/IndentationStrategy.ts

export interface IndentationStrategy {
    getNextIndentation(
        currentLine: string,
        currentIndentation: string
    ): string

    getIndentationAfterClosing(
        currentLine: string,
        currentIndentation: string
    ): string
}