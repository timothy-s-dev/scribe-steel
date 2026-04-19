import { test, expect } from './fixtures';

test.describe('Home page', () => {
  test('signed-out: shows Sign in with Google in the home body', async ({ page }) => {
    await page.goto('/');

    const main = page.locator('#main-content');
    await expect(main.getByRole('heading', { name: 'Scribe Steel' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });

  test.describe('when signed in', () => {
    test.use({ signedIn: true });

    test('hides Sign in with Google in the home body', async ({ page }) => {
      await page.goto('/');

      const main = page.locator('#main-content');
      await expect(main.getByRole('heading', { name: 'Scribe Steel' })).toBeVisible();
      await expect(main.getByRole('button', { name: 'Sign in with Google' })).toHaveCount(0);
    });
  });
});
