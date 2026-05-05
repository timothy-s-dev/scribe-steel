import { test, expect, type Page } from './fixtures';

// 1×1 transparent PNG, base64 encoded. Small enough to use as an inline
// fixture without needing an extra asset file.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=';

function pngBuffer(): Buffer {
  return Buffer.from(TINY_PNG_BASE64, 'base64');
}

test.describe('Typst editor image picker', () => {
  test.use({ signedIn: true });

  test('upload-and-insert flow places an #image() reference in the editor', async ({ page }) => {
    await createHandwrittenDoc(page, 'Image Test');

    // Open the picker via the toolbar button.
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Insert image' })).toBeVisible();

    // Upload a fixture PNG. The picker auto-selects the just-uploaded image
    // and closes the dialog, inserting the reference at the cursor.
    const fileInputPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Upload new/i }).click();
    const fileChooser = await fileInputPromise;
    await fileChooser.setFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: pngBuffer(),
    });

    // Picker closes once the upload resolves and the image is selected.
    await expect(page.getByRole('heading', { name: 'Insert image' })).toBeHidden();

    // The editor should now contain a #image() reference pointing at a
    // drive/<id>.png path.
    await expect(visibleEditor(page)).toContainText(/#image\("\/drive\/[^"]+\.png"\)/);
  });

  test('URL-only insert produces an http reference without uploading', async ({ page }) => {
    // Stub the image fetch so the resolver gets bytes back with a clean
    // CORS-friendly response — otherwise the resolver fires a real network
    // request that triggers a CORS error console message.
    const url = 'https://example.com/banner.png';
    await page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: pngBuffer(),
      });
    });

    await createHandwrittenDoc(page, 'Image URL Test');

    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Insert image' })).toBeVisible();

    await page.getByPlaceholder(/paste an image URL/i).fill(url);
    await page.getByRole('button', { name: 'Insert URL' }).click();

    await expect(page.getByRole('heading', { name: 'Insert image' })).toBeHidden();
    await expect(visibleEditor(page)).toContainText(`#image("${url}")`);
  });

  test('pasting an image into the editor uploads it and inserts an #image() reference', async ({ page }) => {
    await createHandwrittenDoc(page, 'Paste Test');

    // Focus the editor before dispatching a synthetic paste event.
    await visibleEditor(page).click();

    // Dispatch a paste event carrying a PNG file. The editor's domEventHandler
    // intercepts, uploads via the mock Drive, and replaces the placeholder.
    await page.evaluate(async (base64) => {
      const editor = document.querySelector<HTMLElement>('.cm-content');
      if (!editor) throw new Error('editor not found');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], 'pasted.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      editor.dispatchEvent(event);
    }, TINY_PNG_BASE64);

    // The placeholder swaps for the final reference once the upload resolves.
    await expect(visibleEditor(page)).toContainText(/#image\("\/drive\/[^"]+\.png"\)/, {
      timeout: 5_000,
    });
  });

  test('previously uploaded images appear in the picker grid on reopen', async ({ page }) => {
    await createHandwrittenDoc(page, 'Image Reuse Test');

    // First upload — populates the shared images library.
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    const fileInputPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Upload new/i }).click();
    const fileChooser = await fileInputPromise;
    await fileChooser.setFiles({
      name: 'reusable.png',
      mimeType: 'image/png',
      buffer: pngBuffer(),
    });
    await expect(page.getByRole('heading', { name: 'Insert image' })).toBeHidden();

    // Reopen the picker — the previously uploaded image is in the grid.
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    await expect(
      page.getByRole('button', { name: /reusable\.png/ }),
    ).toBeVisible({ timeout: 5_000 });
  });
});

function visibleEditor(page: Page) {
  return page.locator('.cm-content').filter({ visible: true });
}

async function createHandwrittenDoc(page: Page, name: string) {
  await page.goto('/handwritten');
  await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
  await page.getByPlaceholder('Handwritten Document name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);
}
