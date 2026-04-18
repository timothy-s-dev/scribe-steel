import { test, expect } from './fixtures';

test.describe('Settings page', () => {
  test('renders the settings controls', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByText('Print-Friendly', { exact: true })).toBeVisible();
    await expect(page.getByText('Default Zoom', { exact: true })).toBeVisible();
    await expect(page.getByRole('switch')).toBeVisible();
  });

  test('print-friendly toggle persists across reload', async ({ page }) => {
    await page.goto('/settings');

    const toggle = page.getByRole('switch');
    await expect(toggle).not.toBeChecked();

    await toggle.click();
    await expect(toggle).toBeChecked();

    await page.reload();

    await expect(page.getByRole('switch')).toBeChecked();
  });
});
