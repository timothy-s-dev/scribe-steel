import { test, expect, type Page } from './fixtures';

test.describe('Lore Books editor', () => {
  test.describe('Signed-out (demo)', () => {
    test('renders the demo editor with editable fields and toolbar', async ({ page }) => {
      await page.goto('/lore-books/demo');

      await expect(visibleField(page, 'Title')).toBeVisible();
      await expect(visibleField(page, 'Category')).toBeVisible();
      await expect(visibleField(page, 'Epigraph')).toBeVisible();
      await expect(visibleField(page, 'Description')).toBeVisible();

      await expect(page.getByRole('switch', { name: /print-friendly/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    });

    test('demo edits do not persist across reload', async ({ page }) => {
      await page.goto('/lore-books/demo');

      await visibleField(page, 'Title').fill('Ephemeral Lore');
      await visibleField(page, 'Category').fill('Myth');

      await page.reload();

      await expect(visibleField(page, 'Title')).toHaveValue('');
      await expect(visibleField(page, 'Category')).toHaveValue('');
    });

    test('filled fields are compiled into the preview', async ({ page }) => {
      await page.goto('/lore-books/demo');

      // Use distinctive markers so we can spot them unambiguously in the
      // Typst .tsel overlay.
      await visibleField(page, 'Title').fill('CODEX OF ZARANTH');
      await visibleField(page, 'Category').fill('Grimoire Entry');
      await visibleField(page, 'Epigraph').fill('The world listens to those who whisper.');
      await visibleField(page, 'Description').fill('A forbidden treatise bound in drakeskin.');

      await expect(previewText(page, 'CODEX OF ZARANTH')).toBeVisible({ timeout: 15_000 });
      await expect(previewText(page, 'Grimoire Entry')).toBeVisible();
      await expect(previewText(page, 'The world listens to those who whisper.')).toBeVisible();
      await expect(previewText(page, 'A forbidden treatise bound in drakeskin.')).toBeVisible();
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('edits to multiple fields persist across reload', async ({ page }) => {
      await createLoreBook(page, 'Multi-Field Test');

      await visibleField(page, 'Title').fill('The Codex Lumens');
      await visibleField(page, 'Category').fill('Theology');
      await visibleField(page, 'Epigraph').fill('Light conquers all.');
      await visibleField(page, 'Description').fill('A treatise on divine illumination.');

      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();

      await expect(visibleField(page, 'Title')).toHaveValue('The Codex Lumens');
      await expect(visibleField(page, 'Category')).toHaveValue('Theology');
      await expect(visibleField(page, 'Epigraph')).toHaveValue('Light conquers all.');
      await expect(visibleField(page, 'Description')).toHaveValue('A treatise on divine illumination.');
    });

    test('conflict dialog fires when remote changes clash with local edits', async ({ page }) => {
      await createLoreBook(page, 'Conflict Lore');
      const fileId = page.url().split('/').pop()!;

      await visibleField(page, 'Title').fill('baseline');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await simulateRemoteEdit(page, fileId, 'remote edit');

      await visibleField(page, 'Title').fill('local edit');

      await expect(
        page.getByRole('heading', { name: 'Document changed elsewhere' }),
      ).toBeVisible();
    });

    test('auth expiry: 401 on save surfaces modal, reauth fires queued save', async ({ page }) => {
      await createLoreBook(page, 'Auth Expiry Lore');

      await page.evaluate(() => {
        localStorage.setItem('scribe-steel-mock-fail-next', 'save:401');
      });

      await visibleField(page, 'Title').fill('while-expired edit');

      await expect(
        page.getByRole('heading', { name: 'Your session expired' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Sign in with Google' }).click();

      await expect(page.getByText('Saved', { exact: true })).toBeVisible();
      await page.reload();
      await expect(visibleField(page, 'Title')).toHaveValue('while-expired edit');
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createLoreBook(page: Page, name: string) {
  await page.goto('/lore-books');
  await page.getByRole('button', { name: 'Lore Book', exact: true }).click();
  await page.getByPlaceholder('Lore Book name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/lore-books\/[^/]+$/);
}

// Desktop and mobile trees both render the template-params form, so a plain
// placeholder lookup matches two inputs; also use exact so "Epigraph" doesn't
// also match "Epigraph Attribution".
function visibleField(page: Page, placeholder: string) {
  return page.getByPlaceholder(placeholder, { exact: true }).filter({ visible: true });
}

// Matches text rendered into the Typst preview via its selectable overlay.
function previewText(page: Page, text: string) {
  return page.locator('.tsel').filter({ hasText: text });
}

// Mutate the mock Drive state to simulate a concurrent save from another
// device: updates the stored data, assigns a fresh md5, and stamps a new
// modifiedTime. The local cache retains the pre-edit md5, so the next
// save's md5 check detects the mismatch and raises the conflict dialog.
async function simulateRemoteEdit(page: Page, fileId: string, newTitle: string) {
  await page.evaluate(
    ({ id, title }) => {
      const raw = localStorage.getItem('scribe-steel-mock-drive-state')!;
      const state = JSON.parse(raw);
      const doc = state.documents[id];
      doc.data = { ...doc.data, title };
      doc.md5 = crypto.randomUUID();
      doc.modifiedTime = new Date().toISOString();
      localStorage.setItem('scribe-steel-mock-drive-state', JSON.stringify(state));
    },
    { id: fileId, title: newTitle },
  );
}
