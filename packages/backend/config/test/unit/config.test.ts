/**
 * Unit tests for the shared infrastructure config.
 *
 * Only the behaviours that need no broker/database are asserted here: the
 * fail-fast accessors (a service must not silently run without Redis) and the
 * queue topology the publisher and consumer both depend on. Connection and
 * reconnect behaviour is exercised by the integration suite.
 *
 * Run with: npm run test:unit
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { InternalServerError } from "@LCArena/utils"
import {
    channel,
    closeQueue,
    getRedisClient,
    queue,
} from "../../src/index.js"

describe("Redis accessor", () => {
    it("fails fast with a 500 when redisConnect() has not run", () => {
        assert.throws(
            () => getRedisClient(),
            (error: unknown) =>
                error instanceof InternalServerError &&
                error.statusCode === 500 &&
                /Redis Client not found/.test((error as Error).message)
        )
    })
})

describe("RabbitMQ topology", () => {
    it("exposes the queue names shared with the publisher and consumer", () => {
        assert.deepEqual(queue, {
            submissionCreated: "submission.created",
            submissionCompleted: "submission.completed",
            submissionCreatedDeadLetter: "submission.created.dead",
        })
    })

    it("has no channel until connectToQueue() succeeds", () => {
        // The submission service relies on this being falsy to fail loudly
        // instead of dropping a submission on the floor.
        assert.equal(channel, undefined)
    })

    it("closeQueue() is safe to call when nothing was ever connected", async () => {
        await closeQueue()
    })
})
