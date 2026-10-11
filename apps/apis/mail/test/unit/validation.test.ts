import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendOtpEmailSchema } from "../../src/validation";

describe("sendOtpEmailSchema", () => {
    it("accepts and normalizes a valid payload", () => {
        const parsed = sendOtpEmailSchema.parse({
            email: "  User@Example.COM ",
            otp: "123456",
        });

        assert.equal(parsed.email, "user@example.com");
        assert.equal(parsed.otp, "123456");
    });

    it("rejects a malformed email", () => {
        const result = sendOtpEmailSchema.safeParse({
            email: "not-an-email",
            otp: "123456",
        });

        assert.equal(result.success, false);
    });

    it("rejects an OTP that is not six digits", () => {
        for (const otp of ["12345", "1234567", "abcdef", "", "12 34 56"]) {
            const result = sendOtpEmailSchema.safeParse({
                email: "user@example.com",
                otp,
            });

            assert.equal(
                result.success,
                false,
                `${JSON.stringify(otp)} should be rejected`
            );
        }
    });
});
