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

      await signOut(page);

      await expect(page).toHaveURL('/');
    });

    test('redirects to home from an open editor', async ({ page }) => {
      await page.goto('/handwritten');
      await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
      await page.getByPlaceholder('Handwritten Document name').fill('Sign Out Test');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);

      await signOut(page);

      await expect(page).toHaveURL('/');
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
      await page.getByRole('complementary').getByRole('link', { name: 'Handwritten' }).click();
      await expect(page).toHaveURL('/handwritten');

      await expect(
        page.getByText('Sign in with Google to save and manage handwritten documents.'),
      ).toBeVisible();
    });
  });
});
