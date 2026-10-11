import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOtpEmail } from "../../src/templates";

describe("buildOtpEmail", () => {
    it("puts the OTP in the subject, text and html bodies", () => {
        const email = buildOtpEmail("123456");

        assert.match(email.subject, /LCArena/i);
        assert.ok(email.text.includes("123456"));
        assert.ok(email.html.includes("123456"));
    });

    it("mentions the expiry and a safe-ignore notice", () => {
        const email = buildOtpEmail("654321", 5);

        assert.ok(email.text.includes("5 minutes"));
        assert.match(email.text, /ignore/i);
        assert.ok(email.html.includes("5 minutes"));
    });
});
