// indentation/indentationStrategies.ts

import { CppIndentationStrategy } from "./CppIndentationStrategy"
import { PythonIndentationStrategy } from "./PythonIndentationStrategy"
import { IndentationStrategy } from "./IndentationStrategy"

export const indentationStrategies: Record<
    string,
    IndentationStrategy
> = {
    cpp: new CppIndentationStrategy(),
    python: new PythonIndentationStrategy(),
}