import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { submissionCreatedMessageSchema } from "../../src/validation";

const validMessage = {
    submissionId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    userId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    problemId: "cccccccccccccccccccccccc",
    code: "console.log(1)",
    language: "js",
};

describe("submissionCreatedMessageSchema", () => {
    it("accepts a well-formed message", () => {
        const parsed = submissionCreatedMessageSchema.parse(validMessage);

        assert.equal(parsed.submissionId, validMessage.submissionId);
        assert.equal(parsed.language, "js");
    });

    it("accepts and ignores an untrusted status field", () => {
        const parsed = submissionCreatedMessageSchema.parse({
            ...validMessage,
            status: { status: "SUCCESS" },
        });

        assert.equal(parsed.status instanceof Object, true);
        // The worker never trusts it; the persisted submission wins.
        assert.equal(parsed.submissionId, validMessage.submissionId);
    });

    it("rejects malformed object ids", () => {
        for (const field of ["submissionId", "userId", "problemId"] as const) {
            const result = submissionCreatedMessageSchema.safeParse({
                ...validMessage,
                [field]: "not-an-object-id",
            });

            assert.equal(result.success, false, `${field} should be rejected`);
        }
    });

    it("rejects an empty code body", () => {
        const result = submissionCreatedMessageSchema.safeParse({
            ...validMessage,
            code: "",
        });

        assert.equal(result.success, false);
    });

    it("rejects an unsupported language", () => {
        const result = submissionCreatedMessageSchema.safeParse({
            ...validMessage,
            language: "rust",
        });

        assert.equal(result.success, false);
    });
});
