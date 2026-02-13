# Testing Strategy

We run **unit tests** before every production build and in CI so changes are validated before deploy.

## What runs when

- **`npm run test`** — Run all tests once (Jest).
- **`npm run test:watch`** — Run tests in watch mode while developing.
- **`npm run test:ci`** — Run tests in CI mode with coverage report.
- **`npm run build`** — Runs **`npm run test`** first (`prebuild` script). If tests fail, the build does not run.

## CI (GitHub Actions)

On every **push** and **pull request** to `main`, the workflow [`.github/workflows/test-and-build.yml`](../.github/workflows/test-and-build.yml) runs:

1. `npm ci`
2. `npm run test:ci`
3. `npm run build`

So merges and deploys only happen when tests and build pass.

## What we test today

| Area | Location | Notes |
|------|----------|--------|
| Form formatters (EIN, SSN, funding request) | `__tests__/lib/formatters.test.ts` | Parsing and display of form inputs |
| Gift tiers (funding → reward) | `__tests__/lib/gift-from-funding.test.ts` | Customer reward program logic |
| Industry risk mapping | `__tests__/lib/industry-risk.test.ts` | T1–T4 and dropdown consistency |
| Paper classifier (A/B/C/D) | `__tests__/lib/paper-classifier.test.ts` | Revenue, TIB, industry, multiple |
| Application PDF (additional details) | `__tests__/lib/application-pdf.test.ts` | Row labels and revenue formatting |

## Adding tests

- Put test files next to the code (`*.test.ts`) or under `__tests__/` with a mirror of the source layout.
- Jest is configured via `jest.config.mjs` (uses `next/jest` for Next.js compatibility).
- Use `@testing-library/react` for component tests if you add UI tests later.

## Not covered yet (optional next steps)

- **Funder matching** — `getMatchedFunderIds` talks to Supabase. You could extract a pure “filter guidelines by application” function and unit-test it, or add integration tests with a mocked Supabase.
- **Server actions** — Submit, upload, cron handlers: best covered by integration or E2E tests (e.g. Playwright) if you want full flow coverage.
- **E2E** — Multi-step apply flow and PDF download can be automated with Playwright when needed.

Running **`npm run test`** (or **`npm run build`**) before each push keeps the suite as the gate for production.
