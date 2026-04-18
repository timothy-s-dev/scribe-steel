import { test, expect } from './fixtures';

test.describe('Privacy Policy page', () => {
  test('renders the privacy policy heading and body', async ({ page }) => {
    await page.goto('/privacy');

    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'What Scribe Steel Is', level: 2 }),
    ).toBeVisible();
  });
});
