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

      // Preview compiles asynchronously in a Web Worker; when the
      // pipeline is wired up correctly the Typst output lands in the
      // DOM as one or more svg.typst-doc elements.
      await expect(page.locator('svg.typst-doc').first()).toBeVisible({ timeout: 15_000 });
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

    test('small selections render without a truncation banner', async ({ page }) => {
      await page.goto('/monster-cards');

      // Arixx is a small group — single digit monsters, well inside the
      // preview cap. The banner should NOT appear.
      const arixxLabel = page
        .locator('#main-content label')
        .filter({ visible: true })
        .filter({ hasText: 'Arixx' })
        .first();
      await arixxLabel.locator('input[type="checkbox"]').check();

      await expect(page.locator('svg.typst-doc').first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText('Preview truncated').filter({ visible: true })).toHaveCount(0);
    });

    test('selections past the preview cap show the truncation banner and stop at 6 pages', async ({
      page,
    }) => {
      await page.goto('/monster-cards');

      // Enough groups to exceed the 6-page preview cap (cap = 3 sheets ≈ 9
      // small monsters). These five groups together are well over that.
      for (const name of ['Angulotls', 'Animals', 'Arixx', 'Basilisks', 'Bugbears']) {
        const label = page
          .locator('#main-content label')
          .filter({ visible: true })
          .filter({ hasText: name })
          .first();
        await label.locator('input[type="checkbox"]').check();
      }

      // Wait for the banner specifically — it only appears once the
      // compile lands, so this covers the compile wait too.
      await expect(
        page.getByText(/Preview truncated\. Export PDF to see the full document\./).filter({
          visible: true,
        }),
      ).toBeVisible({ timeout: 30_000 });

      // The cap is 6 pages hardcoded in monster-card.typ. If that
      // changes, update here too — the tight coupling is intentional.
      await expect(page.locator('svg.typst-doc')).toHaveCount(6);
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
