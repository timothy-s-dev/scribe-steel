import { test, expect, type Page } from './fixtures';

// Both desktop and mobile trees render the picker panel, so most selectors
// here need `.filter({ visible: true })` to target the viewport-visible copy.

test.describe('Monster Cards page', () => {
  test.describe('Signed-out', () => {
    test('renders with picker and empty selection count', async ({ page }) => {
      await page.goto('/monster-cards');

      await expect(page.getByRole('heading', { name: 'Monster Cards', level: 1 })).toBeVisible();
      await expect(
        page.getByText(/0 monsters selected/).filter({ visible: true }),
      ).toBeVisible();
    });

    test('stock groups render collapsed; a group can be expanded', async ({ page }) => {
      await page.goto('/monster-cards');

      const expandAnimals = page
        .getByRole('button', { name: /Expand Animals/i })
        .filter({ visible: true });
      await expect(expandAnimals).toBeVisible();

      // Before expand: no monster rows visible inside Animals.
      const monsterRowInside = page
        .locator('#main-content')
        .getByText(/L\d+/)
        .filter({ visible: true });
      await expect(monsterRowInside).toHaveCount(0);

      await expandAnimals.click();

      await expect(
        page.getByRole('button', { name: /Collapse Animals/i }).filter({ visible: true }),
      ).toBeVisible();
      await expect(
        page.locator('#main-content').getByText(/L\d+/).filter({ visible: true }).first(),
      ).toBeVisible();
    });

    test('selecting a single monster updates the count and fills the preview', async ({ page }) => {
      await page.goto('/monster-cards');
      await page
        .getByRole('button', { name: /Expand Animals/i })
        .filter({ visible: true })
        .click();

      // Click the first monster row inside Animals. The monster checkboxes
      // sit inside labels nested under the group; the first *group* label
      // sits at the top, so we filter out the one with text "Animals".
      const monsterCheckbox = page
        .locator('#main-content label')
        .filter({ visible: true })
        .filter({ hasNotText: 'Animals' })
        .first()
        .locator('input[type="checkbox"]');

      await monsterCheckbox.check();
      await expect(
        page.getByText(/1 monster selected/).filter({ visible: true }),
      ).toBeVisible();
    });

    test('selecting the group checkbox selects every monster in it', async ({ page }) => {
      await page.goto('/monster-cards');
      await page
        .getByRole('button', { name: /Expand Animals/i })
        .filter({ visible: true })
        .click();

      const animalsLabel = page
        .locator('#main-content label')
        .filter({ visible: true })
        .filter({ hasText: 'Animals' })
        .first();

      await animalsLabel.locator('input[type="checkbox"]').check();

      const countLabel = page.getByText(/\d+ monsters selected/).filter({ visible: true });
      await expect(countLabel).toBeVisible();
      const countText = (await countLabel.textContent()) ?? '';
      const count = parseInt(countText.match(/(\d+) monster/)?.[1] ?? '0', 10);
      expect(count).toBeGreaterThan(1);

      await animalsLabel.locator('input[type="checkbox"]').uncheck();
      await expect(
        page.getByText(/0 monsters selected/).filter({ visible: true }),
      ).toBeVisible();
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('custom monster groups appear with a "Custom" badge and can be selected', async ({
      page,
    }) => {
      await createGroupWithMonster(page, 'Cards Custom');

      await page.goto('/monster-cards');

      const customGroupLabel = page
        .locator('#main-content label')
        .filter({ visible: true })
        .filter({ hasText: 'Cards Custom' });
      await expect(customGroupLabel).toBeVisible();
      await expect(customGroupLabel.getByText('Custom', { exact: true })).toBeVisible();

      await page
        .getByRole('button', { name: /Expand Cards Custom/i })
        .filter({ visible: true })
        .click();

      // Inside the expanded custom group, find the first monster row (which
      // is not the group label itself).
      const monsterCheckbox = page
        .locator('#main-content label')
        .filter({ visible: true })
        .filter({ hasNotText: 'Cards Custom' })
        .first()
        .locator('input[type="checkbox"]');

      await monsterCheckbox.check();
      await expect(
        page.getByText(/1 monster selected/).filter({ visible: true }),
      ).toBeVisible();
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createGroupWithMonster(page: Page, name: string) {
  await page.goto('/monster-groups');
  await page.getByRole('button', { name: 'Monster Group', exact: true }).click();
  await page.getByPlaceholder('e.g., Undead Horde').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);

  await page.getByRole('button', { name: 'Add Monster', exact: true }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
}
