import { test as base, expect } from '@playwright/test';

// Kept in sync with src/services/google-auth.mock.ts — the mock auth service
// treats this localStorage key as "user is signed in" when set to '1'.
const MOCK_AUTH_KEY = 'scribe-steel-mock-signed-in';

type Options = {
  // Flip via `test.use({ signedIn: true })` at the test or describe level to
  // run a test against the mock's signed-in state.
  signedIn: boolean;
};

type Fixtures = {
  consoleGuard: void;
};

export const test = base.extend<Options & Fixtures>({
  signedIn: [false, { option: true }],

  // Override `context` so we can prime localStorage before any page code runs:
  // - always suppress the first-visit storage notice toast, which can intercept
  //   clicks in mobile-sized viewports
  // - prime the mock auth key when signedIn is true
  context: async ({ context, signedIn }, use) => {
    await context.addInitScript(() => {
      window.localStorage.setItem('scribe-steel-storage-notice-dismissed', '1');
    });
    if (signedIn) {
      await context.addInitScript((key) => {
        window.localStorage.setItem(key, '1');
      }, MOCK_AUTH_KEY);
    }
    await use(context);
  },

  // Auto-applied: fail any test that produces a console error, console
  // warning, or uncaught page error.
  consoleGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          problems.push(`[${msg.type()}] ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => {
        problems.push(`[pageerror] ${err.message}`);
      });

      await use();

      expect(
        problems,
        `Unexpected console/page errors:\n${problems.join('\n')}`,
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
