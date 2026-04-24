import { test, expect, type Page } from './fixtures';

// Scope sign-out to the sidebar so we don't accidentally match a doc whose
// name happens to contain "Sign Out" in the list page behind the editor.
function signOut(page: Page) {
  return page.getByRole('complementary').getByRole('button', { name: 'Sign Out' }).click();
}

test.describe('Auth', () => {
  test.describe('Sign-out', () => {
    test.use({ signedIn: true });

    test('redirects to home from a non-home page', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');
      await expect(
        page.locator('#main-content').getByRole('heading', { name: 'Settings' }),
      ).toBeVisible();

      await signOut(page);

      await expect(page).toHaveURL('/');
      // The URL update alone isn't enough — confirm the home page actually rendered.
      await expect(
        page.locator('#main-content').getByRole('heading', { name: 'Scribe Steel' }),
      ).toBeVisible();
      await expect(
        page.locator('#main-content').getByRole('heading', { name: 'Settings' }),
      ).toHaveCount(0);
    });

    test('redirects to home from an open editor', async ({ page }) => {
      await page.goto('/handwritten');
      await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
      await page.getByPlaceholder('Handwritten Document name').fill('Sign Out Test');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);

      await signOut(page);

      await expect(page).toHaveURL('/');
      // Confirm the home body is actually rendered, not the stale editor.
      await expect(
        page.locator('#main-content').getByRole('heading', { name: 'Scribe Steel' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Back to list' })).toHaveCount(0);
    });

    test('list pages show the signed-out UI after sign-out', async ({ page }) => {
      await page.goto('/handwritten');

      // Sanity check: signed-in state doesn't show the sign-in prompt.
      await expect(
        page.locator('#main-content').getByText(/Sign in with Google to save/),
      ).toHaveCount(0);

      await signOut(page);
      await expect(page).toHaveURL('/');

      // Navigate back to the list manually.
      await page.getByRole('complementary').getByRole('link', { name: 'Handwritten Documents' }).click();
      await expect(page).toHaveURL('/handwritten');

      await expect(
        page.getByText('Sign in with Google to save and manage handwritten documents.'),
      ).toBeVisible();
    });
  });

  test.describe('Proactive session expiry', () => {
    test.use({ signedIn: true });

    test('expiring mid-session surfaces the modal; sign-in dismisses it', async ({ page }) => {
      await page.goto('/handwritten');
      await expect(
        page.locator('#main-content').getByText(/Sign in with Google to save/),
      ).toHaveCount(0);

      // Simulate a silent-refresh failure: null the token and fire the
      // session-expired signal, same as the real error_callback path.
      await page.evaluate(() => window.__scribeMockExpireSession?.());

      await expect(
        page.getByRole('heading', { name: 'Your session expired' }),
      ).toBeVisible();

      // Clicking Sign in with Google in the modal flips the mock back to
      // signed-in, which AuthContext observes and clears the expired flag.
      await page.getByRole('button', { name: 'Sign in with Google' }).click();

      await expect(
        page.getByRole('heading', { name: 'Your session expired' }),
      ).toHaveCount(0);
      await expect(
        page.locator('#main-content').getByText(/Sign in with Google to save/),
      ).toHaveCount(0);
    });
  });
});
