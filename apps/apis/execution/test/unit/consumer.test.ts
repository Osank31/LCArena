import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type Channel, type ConsumeMessage } from "amqplib";
import { ELanguage, type IProblem, type ISubmission } from "@LCArena/models";
import { type ExecutionResult } from "@LCArena/execution";
import {
    createSubmissionHandler,
    startConsumer,
    type SubmissionConsumerOptions,
} from "../../src/consumer";
import { type EvaluationDeps } from "../../src/service";
import { type SubmissionCreatedMessage } from "../../src/validation";

const QUEUES = {
    submissionCreated: "submission.created",
    deadLetter: "submission.created.dead",
};

const MESSAGE: SubmissionCreatedMessage = {
    submissionId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    userId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    problemId: "cccccccccccccccccccccccc",
    code: "console.log(1)",
    language: ELanguage.js,
};

const TERMINAL: ExecutionResult = {
    status: "SUCCESS",
    passed: 1,
    total: 1,
    failedCases: { tle: [], re: [], wa: [] },
    executionTimeMs: { tc: 1 },
};

const finalizedSubmission = () =>
    ({
        _id: MESSAGE.submissionId,
        userId: MESSAGE.userId,
        problemId: MESSAGE.problemId,
        code: MESSAGE.code,
        language: ELanguage.js,
        status: TERMINAL,
    }) as unknown as ISubmission;

const makeMessage = (
    payload: unknown,
    headers: Record<string, unknown> = {}
) =>
    ({
        content: Buffer.from(
            typeof payload === "string" ? payload : JSON.stringify(payload)
        ),
        properties: { headers, contentType: "application/json" },
    }) as unknown as ConsumeMessage;

const createChannel = () => {
    const acked: ConsumeMessage[] = [];
    const sent: {
        queue: string;
        content: Buffer;
        options: Record<string, unknown>;
    }[] = [];

    const channel = {
        prefetch: () => channel,
        consume: async () => ({ consumerTag: "test-consumer" }),
        ack: (message: ConsumeMessage) => {
            acked.push(message);
        },
        sendToQueue: (
            queue: string,
            content: Buffer,
            options: Record<string, unknown>
        ) => {
            sent.push({ queue, content, options });
            return true;
        },
    } as unknown as Channel;

    return { channel, acked, sent };
};

const createDeps = (overrides: Partial<EvaluationDeps> = {}): {
    deps: EvaluationDeps;
    persisted: ExecutionResult[];
    published: number;
} => {
    const persisted: ExecutionResult[] = [];
    const counter = { published: 0 };

    const deps: EvaluationDeps = {
        loadSubmission: async () => finalizedSubmission(),
        loadProblem: async () => null as unknown as IProblem,
        acquireTestCases: async () => {
            throw new Error("test cases should not be acquired here");
        },
        runExecutor: async () => {
            throw new Error("executor should not run here");
        },
        persistVerdict: async (_id, status) => {
            persisted.push(status);
            return finalizedSubmission();
        },
        publishCompletion: async () => {
            counter.published += 1;
        },
        ...overrides,
    };

    return { deps, persisted, get published() { return counter.published; } } as {
        deps: EvaluationDeps;
        persisted: ExecutionResult[];
        published: number;
    };
};

const buildHandler = (
    channel: Channel,
    evaluation: EvaluationDeps,
    maxAttempts = 3
) => {
    const options: SubmissionConsumerOptions = {
        channel,
        queues: QUEUES,
        maxAttempts,
        evaluation,
    };

    return createSubmissionHandler(options);
};

describe("createSubmissionHandler", () => {
    it("parks malformed JSON on the dead-letter queue and acks", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps } = createDeps();
        const handler = buildHandler(channel, deps);

        await handler(makeMessage("{not json"));

        assert.equal(acked.length, 1);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].queue, QUEUES.deadLetter);
        assert.equal(
            (sent[0].options.headers as Record<string, unknown>)[
                "x-park-reason"
            ],
            "malformed"
        );
    });

    it("parks messages that fail schema validation", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps } = createDeps();
        const handler = buildHandler(channel, deps);

        await handler(makeMessage({ ...MESSAGE, language: "rust" }));

        assert.equal(acked.length, 1);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].queue, QUEUES.deadLetter);
    });

    it("acks a successfully handled message without re-publishing it", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps } = createDeps();
        const handler = buildHandler(channel, deps);

        await handler(makeMessage(MESSAGE));

        assert.equal(acked.length, 1);
        assert.equal(sent.length, 0);
    });

    it("re-publishes a transient failure with an incremented attempt counter", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps, persisted } = createDeps({
            loadSubmission: async () => {
                throw new Error("mongo is down");
            },
        });
        const handler = buildHandler(channel, deps);

        const message = makeMessage(MESSAGE);
        await handler(message);

        assert.equal(acked.length, 1);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].queue, QUEUES.submissionCreated);
        assert.equal(
            (sent[0].options.headers as Record<string, unknown>)["x-attempts"],
            1
        );
        // The original bytes are preserved so the payload contract is stable.
        assert.deepEqual(sent[0].content, message.content);
        assert.equal(persisted.length, 0);
    });

    it("parks, records INTERNAL_ERROR and acks once retries are exhausted", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps, persisted } = createDeps({
            loadSubmission: async () => {
                throw new Error("still down");
            },
        });
        const handler = buildHandler(channel, deps, 3);

        await handler(makeMessage(MESSAGE, { "x-attempts": 2 }));

        assert.equal(acked.length, 1);
        assert.equal(sent.length, 1);
        assert.equal(sent[0].queue, QUEUES.deadLetter);
        assert.equal(
            (sent[0].options.headers as Record<string, unknown>)[
                "x-park-reason"
            ],
            "retries-exhausted"
        );

        assert.equal(persisted.length, 1);
        assert.equal(persisted[0].status, "INTERNAL_ERROR");
    });

    it("ignores a null message", async () => {
        const { channel, acked, sent } = createChannel();
        const { deps } = createDeps();
        const handler = buildHandler(channel, deps);

        await handler(null);

        assert.equal(acked.length, 0);
        assert.equal(sent.length, 0);
    });
});

describe("startConsumer", () => {
    it("subscribes with manual acknowledgement", async () => {
        const { channel } = createChannel();
        const { deps } = createDeps();

        const tag = await startConsumer({
            channel,
            queues: QUEUES,
            maxAttempts: 3,
            evaluation: deps,
        });

        assert.equal(tag, "test-consumer");
    });
});
