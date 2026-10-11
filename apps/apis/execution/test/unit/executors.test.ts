import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    CPPExecutor,
    JavaExecutor,
    JSExecutor,
    PythonExecutor,
} from "@LCArena/execution";
import { ELanguage } from "@LCArena/models";
import { createExecutor } from "../../src/executors";

describe("createExecutor", () => {
    it("maps every supported language to the right executor", () => {
        assert.ok(createExecutor(ELanguage.cpp) instanceof CPPExecutor);
        assert.ok(createExecutor(ELanguage.java) instanceof JavaExecutor);
        assert.ok(createExecutor(ELanguage.py) instanceof PythonExecutor);
        assert.ok(createExecutor(ELanguage.js) instanceof JSExecutor);
    });

    it("passes the isolated test-case directory through to the executor", () => {
        const executor = createExecutor(
            ELanguage.cpp,
            "/tmp/lcarena-testcases-abc"
        ) as unknown as { testCasesDir: string };

        assert.equal(
            executor.testCasesDir,
            "/tmp/lcarena-testcases-abc"
        );
    });

    it("throws for a language with no registered executor", () => {
        assert.throws(
            () => createExecutor("rust" as ELanguage),
            /No executor registered/
        );
    });
});
