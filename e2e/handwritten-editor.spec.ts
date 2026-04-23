import { test, expect, type Page } from './fixtures';

test.describe('Handwritten editor', () => {
  test.describe('Signed-out (demo)', () => {
    test('renders the demo editor with editable fields and toolbar', async ({ page }) => {
      await page.goto('/handwritten/demo');

      // Title field is editable.
      await expect(visibleTitleInput(page)).toBeVisible();

      // Toolbar controls are present.
      await expect(page.getByRole('switch', { name: /print-friendly/i })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    });

    test('Print-Friendly toggle flips state', async ({ page }) => {
      await page.goto('/handwritten/demo');

      const toggle = page.getByRole('switch', { name: /print-friendly/i });
      await expect(toggle).not.toBeChecked();
      await toggle.click();
      await expect(toggle).toBeChecked();
    });

    test('zoom buttons change the zoom percent', async ({ page }) => {
      await page.goto('/handwritten/demo');

      const percent = page.locator('span.tabular-nums').first();
      const initial = (await percent.textContent()) ?? '';

      await page.getByRole('button', { name: 'Zoom in' }).click();
      await expect(percent).not.toHaveText(initial);

      const after = (await percent.textContent()) ?? '';
      await page.getByRole('button', { name: 'Zoom out' }).click();
      await expect(percent).not.toHaveText(after);
    });

    test('demo edits do not persist across reload', async ({ page }) => {
      await page.goto('/handwritten/demo');

      await visibleTitleInput(page).fill('ephemeral title');
      await expect(visibleTitleInput(page)).toHaveValue('ephemeral title');

      await page.reload();

      await expect(visibleTitleInput(page)).toHaveValue('');
    });

    test('title is compiled into the preview', async ({ page }) => {
      await page.goto('/handwritten/demo');

      const marker = 'Preview Title Marker';
      await visibleTitleInput(page).fill(marker);

      // Typst's SVG overlays selectable text in a .tsel layer — the preview
      // renders the filled title there once compile finishes. First compile
      // includes a WASM load, so the timeout is generous.
      await expect(previewText(page, marker)).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe('Signed-in', () => {
    test.use({ signedIn: true });

    test('opening an existing doc loads its saved title', async ({ page }) => {
      await createDoc(page, 'Persisted Doc');

      await visibleTitleInput(page).fill('My Title');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      // Reload — title must survive.
      await page.reload();
      await expect(visibleTitleInput(page)).toHaveValue('My Title');
    });

    test('title edits persist after reload', async ({ page }) => {
      await createDoc(page, 'Persistence Test');

      await visibleTitleInput(page).fill('first edit');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(visibleTitleInput(page)).toHaveValue('first edit');

      await visibleTitleInput(page).fill('second edit');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await page.reload();
      await expect(visibleTitleInput(page)).toHaveValue('second edit');
    });

    test('conflict dialog fires when remote changes clash with local edits', async ({ page }) => {
      await createDoc(page, 'Conflict Test');
      const fileId = page.url().split('/').pop()!;

      // Baseline save so the cache's version matches the mock's.
      await visibleTitleInput(page).fill('baseline');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      // Simulate another device saving to the same file — bumps the
      // server's version out from under the local cache.
      await simulateRemoteEdit(page, fileId, 'remote edit');

      // Next local save sees the version mismatch and raises the dialog.
      await visibleTitleInput(page).fill('local edit');

      await expect(
        page.getByRole('heading', { name: 'Document changed elsewhere' }),
      ).toBeVisible();
    });

    test('conflict: Discard Local adopts the remote version', async ({ page }) => {
      await createDoc(page, 'Conflict Discard');
      const fileId = page.url().split('/').pop()!;

      await visibleTitleInput(page).fill('baseline');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await simulateRemoteEdit(page, fileId, 'remote wins');

      await visibleTitleInput(page).fill('local edit');

      await expect(
        page.getByRole('heading', { name: 'Document changed elsewhere' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Discard local, use remote' }).click();

      await expect(visibleTitleInput(page)).toHaveValue('remote wins');
    });

    test('conflict: Keep Local overwrites the remote version', async ({ page }) => {
      await createDoc(page, 'Conflict Keep');
      const fileId = page.url().split('/').pop()!;

      await visibleTitleInput(page).fill('baseline');
      await expect(page.getByText('Saved', { exact: true })).toBeVisible();

      await simulateRemoteEdit(page, fileId, 'remote loses');

      await visibleTitleInput(page).fill('local wins');

      await expect(
        page.getByRole('heading', { name: 'Document changed elsewhere' }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Keep local, overwrite remote' }).click();

      await expect(page.getByText('Saved', { exact: true })).toBeVisible();
      await expect(visibleTitleInput(page)).toHaveValue('local wins');
    });

    test('auth expiry: 401 on save surfaces modal, reauth fires queued save', async ({ page }) => {
      await createDoc(page, 'Auth Expiry');

      // Arm the next save to fail with 401, simulating an expired token.
      await page.evaluate(() => {
        localStorage.setItem('scribe-steel-mock-fail-next', 'save:401');
      });

      await visibleTitleInput(page).fill('while-expired edit');

      // Session-expiry modal should surface.
      await expect(
        page.getByRole('heading', { name: 'Your session expired' }),
      ).toBeVisible();

      // Click Sign in with Google — the mock flips signed-in state, the modal
      // closes, and useAutoSave's retry effect fires the queued save.
      await page.getByRole('button', { name: 'Sign in with Google' }).click();

      await expect(page.getByText('Saved', { exact: true })).toBeVisible();
      await page.reload();
      await expect(visibleTitleInput(page)).toHaveValue('while-expired edit');
    });
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createDoc(page: Page, name: string) {
  await page.goto('/handwritten');
  await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
  await page.getByPlaceholder('Handwritten Document name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);
}

function visibleTitleInput(page: Page) {
  return page.getByPlaceholder('Title').filter({ visible: true });
}

// The Typst preview renders each text run as glyph paths and overlays the
// original string in a selectable `.tsel` layer. Matching against `.tsel`
// specifically avoids accidental hits inside the CodeMirror source editor
// (which also contains the literal string).
function previewText(page: Page, text: string) {
  return page.locator('.tsel').filter({ hasText: text });
}

// Mutate the mock Drive state to simulate a concurrent save from another
// device: updates the stored data and bumps the file's version. The local
// cache retains the pre-edit version, so the next save's version check
// detects the mismatch and raises the conflict dialog.
async function simulateRemoteEdit(page: Page, fileId: string, newTitle: string) {
  await page.evaluate(
    ({ id, title }) => {
      const raw = localStorage.getItem('scribe-steel-mock-drive-state')!;
      const state = JSON.parse(raw);
      const doc = state.documents[id];
      doc.data = { ...doc.data, title, updatedAt: new Date().toISOString() };
      doc.version = (doc.version ?? 1) + 1;
      localStorage.setItem('scribe-steel-mock-drive-state', JSON.stringify(state));
    },
    { id: fileId, title: newTitle },
  );
}
