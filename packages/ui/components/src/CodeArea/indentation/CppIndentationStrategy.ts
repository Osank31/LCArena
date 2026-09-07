// indentation/CppIndentationStrategy.ts

import { INDENTATION_SIZE } from "../useCodeEditor"
import type { IndentationStrategy } from "./IndentationStrategy"

export class CppIndentationStrategy
    implements IndentationStrategy {

    getNextIndentation(
        currentLine: string,
        currentIndentation: string
    ): string {

        const trimmedLine = currentLine.trimEnd()

        if (trimmedLine.endsWith("{")) {
            return currentIndentation + " ".repeat(INDENTATION_SIZE)
        }

        return currentIndentation
    }

    getIndentationAfterClosing(
        currentLine: string,
        currentIndentation: string
    ): string {

        if (currentLine.trimStart().startsWith("}")) {
            return currentIndentation.slice(
                0,
                Math.max(0, currentIndentation.length - INDENTATION_SIZE)
            )
        }

        return currentIndentation   
    }
}