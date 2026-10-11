# Submission Service Tests

This directory contains tests for the Submission service.

- `unit/`: Pure unit tests for the validation contract (Zod schemas). They need
  no MongoDB, RabbitMQ or Docker and are what `npm test` runs.
- `api_test/`: End-to-end API tests. They drive every HTTP route and verify both
  that the submission lands in MongoDB and that it is published to the
  `submission.created` RabbitMQ queue.
- `load_test/`: For load testing the service.

## Running

Unit tests need nothing running:

```sh
cd apps/apis/submission
npm test                       # unit suite (node --test + tsx)
```

The API suite needs the service, MongoDB and RabbitMQ running. Start the service
first:

```sh
cd apps/apis/submission && npx tsx src/index.ts
```

Then, from `apps/apis/submission`:

```sh
npm run test:api               # api_test suite (node --test)
TEST_USER_ID=<mongo object id> npm run test:load
TEST_USER_ID=<id> CONCURRENT_REQUESTS=200 npm run test:load
```

Environment overrides: `SUBMISSION_SERVICE_URL` (default
`http://localhost:3002`), `MONGODB_URL`, `RABBITMQ_URL`.

## Notes

- `POST /` is authenticated through the `x-user-id` header: the service looks the
  user up and rejects unknown ids. The api suite seeds the user it needs and
  deletes it afterwards, so no manual setup is required for `npm test`.
- The load test does need a real `TEST_USER_ID`, because it cannot seed one.
- Submissions are published to `submission.created`, which is drained by the
  evaluation worker in `apps/apis/execution` (`@LCArena/evaluator`). Running the
  api suite without that worker leaves a few messages behind, which is expected.
- The create endpoint ignores any client-supplied `status`; a new submission is
  always created as `{ status: "PENDING" }`.

## Known Issues & Problem Logs
*Log any problems happening during tests here.*
