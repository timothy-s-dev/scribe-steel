import { test, expect } from './fixtures';

test.describe('Handwritten list page', () => {
  test.describe('Signed-out', () => {
    test('renders with sign-in prompt and Try-without-saving button', async ({ page }) => {
      await page.goto('/handwritten');

      await expect(page.getByRole('heading', { name: 'Handwritten', level: 1 })).toBeVisible();
      await expect(
        page.getByText('Sign in with Google to save and manage handwritten documents.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try without saving' })).toBeVisible();
    });

    test('Try-without-saving opens the demo editor', async ({ page }) => {
      await page.goto('/handwritten');
      await page.getByRole('button', { name: 'Try without saving' }).click();
      await expect(page).toHaveURL('/handwritten/demo');
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('empty state shows the create prompt', async ({ page }) => {
      await page.goto('/handwritten');

      await expect(page.getByText(/No handwritten documents yet\. Click/)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Handwritten Document', exact: true }),
      ).toBeVisible();
    });

    test('create flow: dialog → name → redirects to editor', async ({ page }) => {
      await page.goto('/handwritten');
      await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'New Handwritten Document' })).toBeVisible();

      // Create is disabled until a name is entered.
      const createButton = page.getByRole('button', { name: 'Create' });
      await expect(createButton).toBeDisabled();

      await page.getByPlaceholder('Handwritten Document name').fill('New Letter');
      await expect(createButton).toBeEnabled();
      await createButton.click();

      await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);
    });

    test('created document appears in the list and opens on click', async ({ page }) => {
      await page.goto('/handwritten');
      await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
      await page.getByPlaceholder('Handwritten Document name').fill('Round Trip');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);

      // Back to list — the doc should be visible.
      await page.getByRole('button', { name: 'Back to list' }).click();
      await expect(page).toHaveURL('/handwritten');

      const listItem = page.locator('#main-content').getByRole('button', { name: /Round Trip/ });
      await expect(listItem).toBeVisible();

      await listItem.click();
      await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);
    });
  });
});
