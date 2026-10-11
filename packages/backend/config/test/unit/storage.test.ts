import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
    formatTestCaseFolderName,
    getProblemTestCasePrefix,
    getTestCaseInputKey,
    getTestCaseOutputKey,
    getStorageConfig,
    resetS3Client,
} from "../../src/storage.config.js";

describe("Storage Key Structure and Formatting", () => {
    it("formats zero-padded three-digit folder names", () => {
        assert.equal(formatTestCaseFolderName(1), "test_case_001");
        assert.equal(formatTestCaseFolderName(2), "test_case_002");
        assert.equal(formatTestCaseFolderName(10), "test_case_010");
        assert.equal(formatTestCaseFolderName(99), "test_case_099");
        assert.equal(formatTestCaseFolderName(100), "test_case_100");
    });

    it("generates deterministic problem storage prefixes", () => {
        const problemId = "670868f7b539958dc191392e";
        const prefix = getProblemTestCasePrefix(problemId);
        assert.equal(
            prefix,
            `Evaluation_Test_Cases/Test_Cases_${problemId}/`
        );
    });

    it("generates exact input.in and output.ans keys matching the required specification", () => {
        const problemId = "problem_123";
        assert.equal(
            getTestCaseInputKey(problemId, 1),
            "Evaluation_Test_Cases/Test_Cases_problem_123/test_case_001/input.in"
        );
        assert.equal(
            getTestCaseOutputKey(problemId, 1),
            "Evaluation_Test_Cases/Test_Cases_problem_123/test_case_001/output.ans"
        );
        assert.equal(
            getTestCaseInputKey(problemId, 42),
            "Evaluation_Test_Cases/Test_Cases_problem_123/test_case_042/input.in"
        );
        assert.equal(
            getTestCaseOutputKey(problemId, 42),
            "Evaluation_Test_Cases/Test_Cases_problem_123/test_case_042/output.ans"
        );
    });
});

describe("Storage Configuration Resolution", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        resetS3Client();
    });

    it("resolves default configuration when env variables are unset", () => {
        delete process.env.S3_ENDPOINT;
        delete process.env.S3_REGION;
        delete process.env.S3_ACCESS_KEY_ID;
        delete process.env.S3_SECRET_ACCESS_KEY;
        delete process.env.S3_BUCKET_NAME;
        delete process.env.S3_FORCE_PATH_STYLE;
        delete process.env.AWS_ACCESS_KEY;
        delete process.env.AWS_SECRET_ACCESS_KEY;

        const config = getStorageConfig();
        assert.equal(config.endpoint, undefined);
        assert.equal(config.region, "us-east-1");
        assert.equal(config.bucketName, "lcarena-testcases");
        assert.equal(config.forcePathStyle, false);
    });

    it("resolves MinIO configuration with custom endpoint and forcePathStyle", () => {
        process.env.S3_ENDPOINT = "http://minio:9000";
        process.env.S3_REGION = "us-east-1";
        process.env.S3_ACCESS_KEY_ID = "customuser";
        process.env.S3_SECRET_ACCESS_KEY = "custompass";
        process.env.S3_BUCKET_NAME = "custom-bucket";
        process.env.S3_FORCE_PATH_STYLE = "true";

        const config = getStorageConfig();
        assert.equal(config.endpoint, "http://minio:9000");
        assert.equal(config.region, "us-east-1");
        assert.equal(config.credentials.accessKeyId, "customuser");
        assert.equal(config.credentials.secretAccessKey, "custompass");
        assert.equal(config.bucketName, "custom-bucket");
        assert.equal(config.forcePathStyle, true);
    });

    it("resolves Cloudflare R2 configuration with custom endpoint and auto region", () => {
        process.env.S3_ENDPOINT =
            "https://abcdef123456.r2.cloudflarestorage.com";
        process.env.S3_REGION = "auto";
        process.env.S3_ACCESS_KEY_ID = "r2accesskey";
        process.env.S3_SECRET_ACCESS_KEY = "r2secretkey";
        process.env.S3_BUCKET_NAME = "lcarena-prod";
        process.env.S3_FORCE_PATH_STYLE = "false";

        const config = getStorageConfig();
        assert.equal(
            config.endpoint,
            "https://abcdef123456.r2.cloudflarestorage.com"
        );
        assert.equal(config.region, "auto");
        assert.equal(config.credentials.accessKeyId, "r2accesskey");
        assert.equal(config.credentials.secretAccessKey, "r2secretkey");
        assert.equal(config.bucketName, "lcarena-prod");
        assert.equal(config.forcePathStyle, false);
    });

    it("falls back to AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY when S3_* are not set", () => {
        delete process.env.S3_ACCESS_KEY_ID;
        delete process.env.S3_SECRET_ACCESS_KEY;
        process.env.AWS_ACCESS_KEY = "aws_key";
        process.env.AWS_SECRET_ACCESS_KEY = "aws_secret";

        const config = getStorageConfig();
        assert.equal(config.credentials.accessKeyId, "aws_key");
        assert.equal(config.credentials.secretAccessKey, "aws_secret");
    });
});
