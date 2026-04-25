# Contributing

Thanks for your interest in contributing to Scribe Steel!

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)

### Getting Started

1. Fork and clone the repo:

   ```bash
   git clone https://github.com/<your-username>/scribe-steel.git
   cd scribe-steel
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the mock dev server:

   ```bash
   npm run dev:mock
   ```

   This swaps in an in-browser mock for Google auth and Drive — no Google account or env setup required. Documents persist to `localStorage`. This is the recommended path for most contributions.

### Working against real Google Drive

If your change touches the auth or Drive integration specifically (and you want to test against the real API rather than the mock), you'll need a Google OAuth Client ID. See [GCP_SETUP.md](GCP_SETUP.md) for the walkthrough. Once it's set up:

```bash
cp .env.example .env.local   # then paste your client ID into VITE_GOOGLE_CLIENT_ID
npm run dev                  # real Drive
```

`VITE_SENTRY_DSN` is optional and only used when you want to test error reporting locally.

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run the linter: `npm run lint`
4. Verify the build: `npm run build`
5. Run the e2e tests: `npm run test:e2e`
6. Open a pull request

## Commit Messages

Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format — a `commit-msg` hook runs commitlint and will reject anything else.

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

- **Type** (required, lowercase): `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`.
- **Subject** (required): short, no trailing period; header max 100 chars.
- **Breaking changes** are signalled by `!` after the type/scope (`feat(api)!: drop legacy fields`) or a `BREAKING CHANGE:` footer.

### How commits drive releases

Every push to `main` runs semantic-release, which aggregates the commits since the last release tag and picks the next version:

| Commit types present | Bump |
|---|---|
| `feat:` | minor (0.1.0 → 0.2.0) |
| only `fix:` / `perf:` | patch (0.1.0 → 0.1.1) |
| any `!` or `BREAKING CHANGE:` | major (0.1.0 → 1.0.0) |
| only `chore`/`docs`/`ci`/`style`/`refactor`/`test`/`build`/`revert` | no release |

The highest-level change wins — a push containing two `fix:` and one `feat:` produces a single minor release. The in-app version and Sentry release name come from `git describe --tags` at build time, so the deployed bundle always reflects the tag semantic-release just created.

## CI E2E Tests

The `Deploy to Firebase Hosting` workflows run the Playwright e2e suite (`npm run test:e2e`) against the mock-Drive dev server before deploying. If the suite fails, the deploy is skipped.

### Debugging a failed e2e run

When e2e tests fail in CI, the workflow uploads a `playwright-report` artifact containing the HTML report plus any traces, screenshots, and videos captured on failure. Retention is 14 days.

To use it:

1. Open the failed run on the [Actions tab](https://github.com/timothy-s-dev/scribe-steel/actions).
2. Scroll to the **Artifacts** section at the bottom of the run summary and download `playwright-report.zip`.
3. Unzip it, then serve the report locally:

   ```bash
   npx playwright show-report path/to/unzipped/playwright-report
   ```

   This opens an interactive report in your browser. Click into any failed test to see the failure step, screenshots, and a recorded trace (Playwright's time-travel debugger) when available.

4. The `test-results/` subfolder contains raw per-test artifacts (traces as `.zip`, videos, screenshots) if you'd rather inspect them directly — open a trace with `npx playwright show-trace path/to/trace.zip`.

## Reporting Bugs

Use the [Bug Report](https://github.com/timothy-s-dev/scribe-steel/issues/new?template=bug-report.yml) issue template.

## Suggesting Features

Use the [Feature Request](https://github.com/timothy-s-dev/scribe-steel/issues/new?template=feature-request.md) issue template.
