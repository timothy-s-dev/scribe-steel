# Contributing

Thanks for your interest in contributing to Scribe Steel!

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- A Google Cloud project with OAuth credentials (see [docs/google-cloud-setup.md](docs/google-cloud-setup.md))

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

3. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   See [docs/google-cloud-setup.md](docs/google-cloud-setup.md) for how to get a Google OAuth Client ID. Sentry DSN is optional.

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Run the linter: `npm run lint`
4. Verify the build: `npm run build`
5. Open a pull request

## Reporting Bugs

Use the [Bug Report](https://github.com/timothy-s-dev/scribe-steel/issues/new?template=bug-report.yml) issue template.

## Suggesting Features

Use the [Feature Request](https://github.com/timothy-s-dev/scribe-steel/issues/new?template=feature-request.md) issue template.
