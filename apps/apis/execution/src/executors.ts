import {
    CPPExecutor,
    JavaExecutor,
    JSExecutor,
    PythonExecutor,
    type Executor,
} from "@LCArena/execution";
import { ELanguage } from "@LCArena/models";

type ExecutorFactory = new (testCasesDir?: string) => Executor;

const executorRegistry: Record<ELanguage, ExecutorFactory> = {
    [ELanguage.cpp]: CPPExecutor,
    [ELanguage.java]: JavaExecutor,
    [ELanguage.py]: PythonExecutor,
    [ELanguage.js]: JSExecutor,
};

/**
 * Resolves the sandbox executor for a language. `testCasesDir` points the
 * executor at the isolated per-submission workspace prepared by the worker.
 */
export const createExecutor = (
    language: ELanguage,
    testCasesDir?: string
): Executor => {
    const ExecutorClass = executorRegistry[language];

    if (!ExecutorClass) {
        throw new Error(`No executor registered for language: ${language}`);
    }

    return new ExecutorClass(testCasesDir);
};
