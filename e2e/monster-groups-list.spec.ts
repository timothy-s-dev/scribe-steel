import { test, expect } from './fixtures';

test.describe('Monster Groups list page', () => {
  test.describe('Signed-out', () => {
    test('shows sign-in prompt without a Try-without-saving button', async ({ page }) => {
      await page.goto('/monster-groups');

      await expect(page.getByRole('heading', { name: 'Monster Groups', level: 1 })).toBeVisible();
      await expect(
        page.getByText('Sign in with Google to save and manage monster groups.'),
      ).toBeVisible();
      // Monster groups has no demo-enabled flag, so no "Try without saving".
      await expect(page.getByRole('button', { name: 'Try without saving' })).toHaveCount(0);
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('empty state shows the create prompt', async ({ page }) => {
      await page.goto('/monster-groups');

      await expect(page.getByText(/No monster groups yet\. Click/)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Monster Group', exact: true }),
      ).toBeVisible();
    });

    test('create flow (name only): dialog → name → redirects to editor', async ({ page }) => {
      await page.goto('/monster-groups');
      await page.getByRole('button', { name: 'Monster Group', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'New Monster Group' })).toBeVisible();

      const createButton = page.getByRole('button', { name: 'Create' });
      await expect(createButton).toBeDisabled();

      await page.getByPlaceholder('e.g., Undead Horde').fill('Bandits');
      await expect(createButton).toBeEnabled();
      await createButton.click();

      await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);
    });

    test('create with "copy malice from" copies malice onto the new group', async ({ page }) => {
      await page.goto('/monster-groups');
      await page.getByRole('button', { name: 'Monster Group', exact: true }).click();

      await page.getByPlaceholder('e.g., Undead Horde').fill('Copied Malice');
      // First dropdown option is "Start empty"; index 1 is the first source
      // with malice from the stock bestiary.
      const select = page.locator('select');
      await select.selectOption({ index: 1 });

      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);

      // Editor loaded — the group should already have at least one malice feature.
      await expect(page.getByText('Malice Features').first()).toBeVisible();
      // Every malice entry is removable via an aria-labelled button; count > 0.
      await expect(
        page.getByRole('button', { name: 'Remove malice feature' }).first(),
      ).toBeVisible();
    });

    test('created group appears in the list and opens on click', async ({ page }) => {
      await page.goto('/monster-groups');
      await page.getByRole('button', { name: 'Monster Group', exact: true }).click();
      await page.getByPlaceholder('e.g., Undead Horde').fill('Round Trip Group');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);

      await page.getByRole('button', { name: 'Back to list' }).click();
      await expect(page).toHaveURL('/monster-groups');

      const listItem = page
        .locator('#main-content')
        .getByRole('button', { name: /Round Trip Group/ });
      await expect(listItem).toBeVisible();

      await listItem.click();
      await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);
    });
  });
});
