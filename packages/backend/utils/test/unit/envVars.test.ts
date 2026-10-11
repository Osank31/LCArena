import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import getEnvVariable from "../../src/envVars.js";

const KEY = "LCA_TEST_ENV_VARIABLE";

describe("getEnvVariable", () => {
    beforeEach(() => {
        delete process.env[KEY];
    });

    afterEach(() => {
        delete process.env[KEY];
    });

    it("returns the configured value", () => {
        process.env[KEY] = "configured";

        assert.equal(getEnvVariable(KEY), "configured");
    });

    it("throws for a missing required variable and names it", () => {
        assert.throws(() => getEnvVariable(KEY), new RegExp(KEY));
    });

    it("treats a whitespace-only value as missing when required", () => {
        process.env[KEY] = "   ";

        assert.throws(() => getEnvVariable(KEY), new RegExp(KEY));
    });

    it("returns an empty string for a missing optional variable", () => {
        assert.equal(getEnvVariable(KEY, false), "");
    });

    it("still returns a configured value when marked optional", () => {
        process.env[KEY] = "optional-value";

        assert.equal(getEnvVariable(KEY, false), "optional-value");
    });
});
