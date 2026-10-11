import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { logger } from "../../src/logger.js";

/** Runs `fn` while capturing everything the logger writes. */
const captureLog = (fn: () => void): string => {
    const lines: string[] = [];
    const spy = mock.method(logger, "info", (...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
        return logger;
    });

    try {
        fn();
    } finally {
        spy.mock.restore();
    }

    return lines.join("\n");
};

describe("logger.table", () => {
    it("reports an empty table instead of printing a broken frame", () => {
        const output = captureLog(() => logger.table([]));

        assert.match(output, /Table is empty/);
    });

    it("renders a bordered table with a union of all columns", () => {
        const output = captureLog(() =>
            logger.table([
                { name: "tc_01", verdict: "PASS" },
                { name: "tc_02", verdict: "WA", time: 12 },
            ])
        );

        assert.match(output, /\|\s*name\s*\|\s*verdict\s*\|\s*time\s*\|/);
        assert.match(output, /tc_01/);
        assert.match(output, /tc_02/);
        assert.match(output, /\+-+\+-+\+-+\+/);
    });

    it("renders missing cells as empty instead of the string 'undefined'", () => {
        const output = captureLog(() =>
            logger.table([{ a: 1 }, { a: 2, b: 3 }])
        );

        assert.equal(output.includes("undefined"), false);
    });
});
