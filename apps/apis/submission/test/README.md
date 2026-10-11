# Submission Service Tests

This directory contains tests for the Submission service.

- `api_test/`: End-to-end API tests. They drive every HTTP route and verify both
  that the submission lands in MongoDB and that it is published to the
  `submission.created` RabbitMQ queue.
- `load_test/`: For load testing the service.

## Running

Start the service first (it needs MongoDB and RabbitMQ reachable):

```sh
cd apps/apis/submission && npx tsx src/index.ts
```

Then, from `apps/apis/submission`:

```sh
npm test                       # api_test suite (node --test)
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
- Submissions are published to `submission.created`, which currently has **no
  consumer** — the evaluation worker that used to drain it no longer exists. Any
  message left on that queue is expected until that worker is restored. Running
  the api suite therefore leaves a few messages behind.

## Known Issues & Problem Logs
*Log any problems happening during tests here.*
