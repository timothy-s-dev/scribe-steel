import { test, expect } from './fixtures';

test.describe('Lore Books list page', () => {
  test.describe('Signed-out', () => {
    test('renders with sign-in prompt and Try-without-saving button', async ({ page }) => {
      await page.goto('/lore-books');

      await expect(page.getByRole('heading', { name: 'Lore Books', level: 1 })).toBeVisible();
      await expect(
        page.getByText('Sign in with Google to save and manage lore books.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try without saving' })).toBeVisible();
    });

    test('Try-without-saving opens the demo editor', async ({ page }) => {
      await page.goto('/lore-books');
      await page.getByRole('button', { name: 'Try without saving' }).click();
      await expect(page).toHaveURL('/lore-books/demo');
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('empty state shows the create prompt', async ({ page }) => {
      await page.goto('/lore-books');

      await expect(page.getByText(/No lore books yet\. Click/)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Lore Book', exact: true }),
      ).toBeVisible();
    });

    test('create flow: dialog → name → redirects to editor', async ({ page }) => {
      await page.goto('/lore-books');
      await page.getByRole('button', { name: 'Lore Book', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'New Lore Book' })).toBeVisible();

      const createButton = page.getByRole('button', { name: 'Create' });
      await expect(createButton).toBeDisabled();

      await page.getByPlaceholder('Lore Book name').fill('On the Fall of Kaltrom');
      await expect(createButton).toBeEnabled();
      await createButton.click();

      await expect(page).toHaveURL(/\/lore-books\/[^/]+$/);
    });

    test('created lore book appears in the list and opens on click', async ({ page }) => {
      await page.goto('/lore-books');
      await page.getByRole('button', { name: 'Lore Book', exact: true }).click();
      await page.getByPlaceholder('Lore Book name').fill('Round Trip Lore');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/lore-books\/[^/]+$/);

      await page.getByRole('button', { name: 'Back to list' }).click();
      await expect(page).toHaveURL('/lore-books');

      const listItem = page.locator('#main-content').getByRole('button', { name: /Round Trip Lore/ });
      await expect(listItem).toBeVisible();

      await listItem.click();
      await expect(page).toHaveURL(/\/lore-books\/[^/]+$/);
    });
  });
});
