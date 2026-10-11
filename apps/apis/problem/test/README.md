# Problem Service Tests

This directory contains tests for the Problem service.

- `api_test/`: End-to-end API tests. They drive every HTTP route and verify the
  data actually lands in MongoDB by reading it back with the MongoDB driver.
- `load_test/`: For load testing the service.

## Running

Start the service first (it needs MongoDB reachable):

```sh
cd apps/apis/problem && npx tsx src/index.ts
```

Then, from `apps/apis/problem`:

```sh
npm test                       # api_test suite (node --test)
npm run test:load              # load test, 50 concurrent GET /
CONCURRENT_REQUESTS=200 npm run test:load
```

Environment overrides: `PROBLEM_SERVICE_URL` (default `http://localhost:3001`)
and `MONGODB_URL` (default `mongodb://localhost:27017/lcarena`).

## Notes

- The api suite creates its own fixtures and removes them again, so it is safe
  to re-run against a live database.
- The load test only performs reads, so it does not add data.

## Known Issues & Problem Logs
*Log any problems happening during tests here.*
