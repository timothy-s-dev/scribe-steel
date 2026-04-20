import { test, expect, type Page, type Locator } from './fixtures';

// Like the other editor pages, Encounter Sheets renders two copies of the form
// panel (desktop + mobile). All locators below go through the `visible` helper
// so they target the viewport-visible copy.

test.describe('Encounter Sheets editor', () => {
  test.describe('Signed-out (demo)', () => {
    test('renders the demo editor with the expected form sections', async ({ page }) => {
      await page.goto('/encounter-sheets/demo');

      await expect(visible(page.getByText('Encounter Info'))).toBeVisible();
      await expect(visible(page.getByText('Malice Features'))).toBeVisible();
      await expect(visible(page.getByText('Creature Groups'))).toBeVisible();
      await expect(visible(page.getByText('Content', { exact: true }))).toBeVisible();

      // Toolbar bits are rendered too.
      await expect(page.getByRole('switch', { name: /print-friendly/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    });

    test('encounter name, group label, and creature name appear in the preview', async ({ page }) => {
      await page.goto('/encounter-sheets/demo');

      await visible(page.getByRole('textbox', { name: 'Title', exact: true })).fill('BATTLE_OF_CINDER');

      // Add Group creates a group that already contains a blank creature row,
      // so we can fill both in one pass without clicking Add Creature.
      await visible(page.getByRole('button', { name: 'Add Group' })).click();
      await visible(page.getByPlaceholder('Group label')).fill('VANGUARD_SQUAD');
      await visible(page.getByPlaceholder('Creature name')).fill('GOBLIN_SCOUT');

      await expect(previewText(page, 'BATTLE_OF_CINDER')).toBeVisible({ timeout: 15_000 });
      await expect(previewText(page, 'VANGUARD_SQUAD')).toBeVisible();
      await expect(previewText(page, 'GOBLIN_SCOUT')).toBeVisible();
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('editing encounter fields persists across reload', async ({ page }) => {
      await createEncounter(page, 'Persistence Encounter');

      await visible(page.getByRole('textbox', { name: 'Title', exact: true })).fill('The Ambush');
      await visible(page.getByRole('textbox', { name: 'Objective', exact: true })).fill(
        'Survive five rounds.',
      );
      // Explicit debounce wait — 'Saved' may already be visible from the
      // initial creation mutation, so waiting on it can return too early.
      await page.waitForTimeout(2500);

      await page.reload();

      await expect(
        visible(page.getByRole('textbox', { name: 'Title', exact: true })),
      ).toHaveValue('The Ambush');
      await expect(
        visible(page.getByRole('textbox', { name: 'Objective', exact: true })),
      ).toHaveValue('Survive five rounds.');
    });

    test('add + remove a malice feature', async ({ page }) => {
      await createEncounter(page, 'Malice Test');

      await visible(page.getByRole('button', { name: 'Add Malice Feature' })).click();

      // Now there's one malice row — unique name/description placeholders.
      await visible(page.getByPlaceholder('Name')).fill('Shadow Blade');
      await visible(page.getByPlaceholder('Description')).fill('+2 to all attacks');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(visible(page.getByPlaceholder('Name'))).toHaveValue('Shadow Blade');

      // Remove the row.
      await visible(page.getByRole('button', { name: 'Remove malice feature' })).click();
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(
        visible(page.getByRole('button', { name: 'Remove malice feature' })),
      ).toHaveCount(0);
    });

    test('import malice from a stock group', async ({ page }) => {
      await createEncounter(page, 'Import Malice');

      // Before import: no malice rows.
      await expect(
        visible(page.getByRole('button', { name: 'Remove malice feature' })),
      ).toHaveCount(0);

      // The import-from-group select appears next to "Add Malice Feature"
      // only when at least one group with malice exists. Pick the first
      // non-placeholder option.
      const importSelect = visible(page.locator('select').filter({ hasText: 'Import from group' }));
      await importSelect.selectOption({ index: 1 });

      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      // At least one malice row now exists.
      await expect(
        visible(page.getByRole('button', { name: 'Remove malice feature' })).first(),
      ).toBeVisible();
    });

    test('add + remove creature group', async ({ page }) => {
      await createEncounter(page, 'Group Test');

      await visible(page.getByRole('button', { name: 'Add Group' })).click();

      const groupLabel = visible(page.getByPlaceholder('Group label'));
      await groupLabel.fill('Vanguard');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(visible(page.getByPlaceholder('Group label'))).toHaveValue('Vanguard');

      await visible(page.getByRole('button', { name: 'Remove group' })).click();
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(visible(page.getByPlaceholder('Group label'))).toHaveCount(0);
    });

    test('add a creature to a group and persist', async ({ page }) => {
      await createEncounter(page, 'Creature Test');

      // Add Group seeds the new group with a single blank creature, so one
      // Remove-creature button already exists after this click.
      await visible(page.getByRole('button', { name: 'Add Group' })).click();
      await visible(page.getByPlaceholder('Group label')).fill('Skirmishers');
      await expect(
        visible(page.getByRole('button', { name: 'Remove creature' })),
      ).toHaveCount(1);

      // Add Creature pushes the total to two.
      await visible(page.getByRole('button', { name: 'Add Creature' })).click();
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();

      // Both the seeded and the explicitly-added creature survive the reload.
      await expect(
        visible(page.getByRole('button', { name: 'Remove creature' })),
      ).toHaveCount(2);
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createEncounter(page: Page, name: string) {
  await page.goto('/encounter-sheets');
  await page.getByRole('button', { name: 'Encounter Sheet', exact: true }).click();
  await page.getByPlaceholder('Encounter Sheet name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/encounter-sheets\/[^/]+$/);
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

// Matches text rendered into the Typst preview via its selectable overlay.
function previewText(page: Page, text: string) {
  return page.locator('.tsel').filter({ hasText: text });
}
