import { test, expect, type Page } from './fixtures';

// Auto-save invariants are doc-shape-agnostic — using a Handwritten doc as
// the vehicle because its creation flow is the simplest (just a name).

test.describe('Auto-save', () => {
  test.use({ signedIn: true });

  test.beforeEach(async ({ context }) => {
    // Install a counter that tracks every write to the mock Drive state so
    // tests can distinguish "save fired" from "save was debounced away."
    await context.addInitScript(() => {
      const w = window as unknown as { __saveWrites: number };
      w.__saveWrites = 0;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'scribe-steel-mock-drive-state') {
          w.__saveWrites = (w.__saveWrites ?? 0) + 1;
        }
        return orig.call(this, key, value);
      };
    });
  });

  test('rapid typing coalesces into a single save', async ({ page }) => {
    await createHandwrittenDoc(page, 'Debounce Test');
    await resetSaveCounter(page);

    await visibleTitleInput(page).pressSequentially('hello world', { delay: 50 });

    // Wait for the debounce window to elapse and the save to land.
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    expect(await readSaveCounter(page)).toBe(1);
  });

  test('editor unmount before debounce flushes the pending save', async ({ page }) => {
    await createHandwrittenDoc(page, 'Unmount Flush Test');
    await resetSaveCounter(page);

    await visibleTitleInput(page).pressSequentially('unsaved title', { delay: 10 });

    // Sanity check: the debounce hasn't fired yet.
    expect(await readSaveCounter(page)).toBe(0);

    // Navigate away — this is the unmount that should trigger a flush.
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page).toHaveURL('/handwritten');

    // The flush should have fired synchronously on unmount. Give microtasks
    // a beat to settle, but well under the 2s debounce window.
    await page.waitForTimeout(100);

    expect(await readSaveCounter(page)).toBe(1);
  });

  test('save failure surfaces "Save failed"', async ({ page }) => {
    await createHandwrittenDoc(page, 'Save Fail Test');

    // Arm the mock to reject the next save with a 500. The mock consumes the
    // flag on use so this affects exactly one save.
    await page.evaluate(() => {
      localStorage.setItem('scribe-steel-mock-fail-next', 'save:500');
    });

    await visibleTitleInput(page).pressSequentially('will fail', { delay: 10 });

    await expect(page.getByText('Save failed', { exact: true })).toBeVisible();
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createHandwrittenDoc(page: Page, name: string) {
  await page.goto('/handwritten');
  await page.getByRole('button', { name: 'Handwritten Document', exact: true }).click();
  await page.getByPlaceholder('Handwritten Document name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/handwritten\/[^/]+$/);
}

// The editor renders one copy of the panel tree for desktop and one for
// mobile, so plain placeholder lookups find two inputs. Filter to the
// viewport-visible one.
function visibleTitleInput(page: Page) {
  return page.getByPlaceholder('Title').filter({ visible: true });
}

function resetSaveCounter(page: Page) {
  return page.evaluate(() => {
    (window as unknown as { __saveWrites: number }).__saveWrites = 0;
  });
}

function readSaveCounter(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __saveWrites: number }).__saveWrites,
  );
}
