import { test, expect } from './fixtures';

test.describe('Encounter Sheets list page', () => {
  test.describe('Signed-out', () => {
    test('renders with sign-in prompt and Try-without-saving button', async ({ page }) => {
      await page.goto('/encounter-sheets');

      await expect(
        page.getByRole('heading', { name: 'Encounter Sheets', level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByText('Sign in with Google to save and manage encounters.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try without saving' })).toBeVisible();
    });

    test('Try-without-saving opens the demo editor', async ({ page }) => {
      await page.goto('/encounter-sheets');
      await page.getByRole('button', { name: 'Try without saving' }).click();
      await expect(page).toHaveURL('/encounter-sheets/demo');
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('empty state shows the create prompt', async ({ page }) => {
      await page.goto('/encounter-sheets');

      await expect(page.getByText(/No encounters yet\. Click/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Encounter', exact: true })).toBeVisible();
    });

    test('create flow: dialog → name → redirects to editor', async ({ page }) => {
      await page.goto('/encounter-sheets');
      await page.getByRole('button', { name: 'Encounter', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'New Encounter' })).toBeVisible();

      const createButton = page.getByRole('button', { name: 'Create' });
      await expect(createButton).toBeDisabled();

      await page.getByPlaceholder('Encounter name').fill('Battle of the Ford');
      await expect(createButton).toBeEnabled();
      await createButton.click();

      await expect(page).toHaveURL(/\/encounter-sheets\/[^/]+$/);
    });

    test('created encounter appears in the list and opens on click', async ({ page }) => {
      await page.goto('/encounter-sheets');
      await page.getByRole('button', { name: 'Encounter', exact: true }).click();
      await page.getByPlaceholder('Encounter name').fill('Round Trip Encounter');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/encounter-sheets\/[^/]+$/);

      await page.getByRole('button', { name: 'Back to list' }).click();
      await expect(page).toHaveURL('/encounter-sheets');

      const listItem = page
        .locator('#main-content')
        .getByRole('button', { name: /Round Trip Encounter/ });
      await expect(listItem).toBeVisible();

      await listItem.click();
      await expect(page).toHaveURL(/\/encounter-sheets\/[^/]+$/);
    });
  });
});
