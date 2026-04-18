import { test, expect, type Page } from './fixtures';

test.describe('Monster Groups editor', () => {
  test.use({ signedIn: true });

  test('opening an existing group loads its name', async ({ page }) => {
    const groupName = 'Loaded Group';
    await createGroup(page, groupName);

    await expect(page.getByPlaceholder('Group name').filter({ visible: true })).toHaveValue(
      groupName,
    );
  });

  test('renaming the group persists', async ({ page }) => {
    await createGroup(page, 'First Name');

    const titleInput = page.getByPlaceholder('Group name').filter({ visible: true });
    await titleInput.fill('Second Name');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByPlaceholder('Group name').filter({ visible: true })).toHaveValue(
      'Second Name',
    );
  });

  test('add + edit + persist a malice feature', async ({ page }) => {
    await createGroup(page, 'Malice Group');

    await page.getByRole('button', { name: 'Add Malice Feature' }).click();

    // Fill the new row's fields (one row, so unique).
    await page.getByPlaceholder('3').fill('5');
    await page.getByPlaceholder('Name', { exact: true }).fill('Shadow Strike');
    await page.getByPlaceholder('Description').fill('Deal 1d6 damage.');

    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();

    await expect(page.getByPlaceholder('3')).toHaveValue('5');
    await expect(page.getByPlaceholder('Name', { exact: true })).toHaveValue('Shadow Strike');
    await expect(page.getByPlaceholder('Description')).toHaveValue('Deal 1d6 damage.');
  });

  test('remove malice feature persists', async ({ page }) => {
    await createGroup(page, 'Malice Remove');

    await page.getByRole('button', { name: 'Add Malice Feature' }).click();
    await page.getByPlaceholder('Name', { exact: true }).fill('Doomed');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    // There's a desktop-only remove button and a mobile-only one. Click the
    // visible one.
    await page
      .getByRole('button', { name: 'Remove malice feature' })
      .filter({ visible: true })
      .click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('button', { name: 'Remove malice feature' })).toHaveCount(0);
  });

  test('add blank monster and persist', async ({ page }) => {
    await createGroup(page, 'Monster Add');

    // Count monster cards before: zero. Add a blank monster.
    await page.getByRole('button', { name: 'Add Monster', exact: true }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();

    // After reload, there should still be a monster — check that the section
    // has a Remove button (the MonsterEditor always renders one).
    await expect(
      page.getByRole('button', { name: 'Remove monster' }).filter({ visible: true }),
    ).toBeVisible();
  });

  test('copy a monster from the bestiary and persist', async ({ page }) => {
    await createGroup(page, 'Bestiary Copy');

    await page.getByRole('button', { name: 'Copy from Bestiary' }).click();

    // Dialog is open — pick the first bestiary monster by clicking the first
    // option row. Each option shows the monster name as the main text.
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Copy from Bestiary' })).toBeVisible();

    const firstOption = dialog.locator('button').filter({ hasText: /L\d+/ }).first();
    const monsterName = (await firstOption.locator('> span').first().textContent())?.trim() ?? '';
    expect(monsterName).not.toBe('');
    await firstOption.click();

    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();

    // Monster is present — the remove button for a monster should be visible.
    await expect(
      page.getByRole('button', { name: 'Remove monster' }).filter({ visible: true }),
    ).toBeVisible();
  });

  test('remove monster persists', async ({ page }) => {
    await createGroup(page, 'Monster Remove');

    await page.getByRole('button', { name: 'Add Monster', exact: true }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page
      .getByRole('button', { name: 'Remove monster' })
      .filter({ visible: true })
      .click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('button', { name: 'Remove monster' })).toHaveCount(0);
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createGroup(page: Page, name: string) {
  await page.goto('/monster-groups');
  await page.getByRole('button', { name: 'Monster Group', exact: true }).click();
  await page.getByPlaceholder('e.g., Undead Horde').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/monster-groups\/[^/]+$/);
}
