// indentation/PythonIndentationStrategy.ts

import { INDENTATION_SIZE } from "../useCodeEditor"
import type { IndentationStrategy } from "./IndentationStrategy"

export class PythonIndentationStrategy
    implements IndentationStrategy {

    getNextIndentation(
        currentLine: string,
        currentIndentation: string
    ): string {

        const trimmedLine = currentLine.trimEnd()

        if (trimmedLine.endsWith(":")) {
            return currentIndentation + " ".repeat(INDENTATION_SIZE)
        }

        return currentIndentation
    }

    getIndentationAfterClosing(
        _currentLine: string,
        currentIndentation: string
    ): string {
        return currentIndentation
    }
}