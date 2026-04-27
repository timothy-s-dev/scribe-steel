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

    // Wait for the debounce window to elapse and the save to land. The 2s
    // debounce eats most of the default 5s expect window, so on a loaded
    // CI runner the badge can land just past the deadline — match the
    // longer timeout used elsewhere in this file.
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

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

  test('transient save failure shows the retry banner with countdown', async ({ page }) => {
    await createHandwrittenDoc(page, 'Save Retry Test');

    // Arm the mock to reject the next save with a 500. The mock consumes the
    // flag on use so the next attempt after this one succeeds.
    await page.evaluate(() => {
      localStorage.setItem('scribe-steel-mock-fail-next', 'save:500');
    });

    await visibleTitleInput(page).pressSequentially('will retry', { delay: 10 });

    // The first attempt fails; the banner appears with attempt 2 queued.
    await expect(page.getByRole('status')).toContainText("Couldn't save to Drive");
    await expect(page.getByRole('status')).toContainText('attempt 2');

    // The backoff timer fires the retry, which succeeds against the mock
    // (the failure flag was consumed by the first attempt). The banner
    // clears and the saved indicator returns.
    await expect(page.getByRole('status')).toBeHidden({ timeout: 5_000 });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  test('repeated failures back off and surface increasing attempt counts', async ({ page }) => {
    await createHandwrittenDoc(page, 'Backoff Test');

    // Fail the next 3 saves so we observe attempts 2, 3, 4 before recovery.
    await page.evaluate(() => {
      localStorage.setItem('scribe-steel-mock-fail-next', 'save:500x3');
    });

    await visibleTitleInput(page).pressSequentially('keep failing', { delay: 10 });

    await expect(page.getByRole('status')).toContainText('attempt 2');
    await expect(page.getByRole('status')).toContainText('attempt 3', { timeout: 6_000 });
    await expect(page.getByRole('status')).toContainText('attempt 4', { timeout: 10_000 });
    // Fourth attempt succeeds (the failure budget was 3) — banner clears.
    await expect(page.getByRole('status')).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  });

  test('edit during an in-flight save is queued, not raced into a conflict', async ({ page }) => {
    await createHandwrittenDoc(page, 'Concurrent Edit Test');

    // Land a baseline save so the cached md5 matches what's on the
    // mock, and the editor's save-status observer has seen a success.
    await visibleTitleInput(page).fill('baseline');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    // Slow the next save past the debounce window. Without serialization,
    // a second edit's save would fire while the first is still waiting
    // for the mock's response — both would hit Drive with the pre-save
    // md5, and whichever commits second would raise a conflict.
    await page.evaluate(() => {
      localStorage.setItem('scribe-steel-mock-slow-next', 'save:3000');
    });

    // First edit kicks off the slow save.
    await visibleTitleInput(page).fill('first');
    await expect(page.getByText('Saving...', { exact: true })).toBeVisible();

    // Second edit arrives while the first save is still in flight. It
    // should be queued into the post-save drain path instead of racing.
    await visibleTitleInput(page).fill('first plus second');

    // The conflict dialog would fire if the race opened — assert it
    // never appears during the whole settle window.
    await expect(
      page.getByRole('heading', { name: 'Document changed elsewhere' }),
    ).toBeHidden();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Round-trip: the queued edit's value is what actually persisted.
    await page.reload();
    await expect(visibleTitleInput(page)).toHaveValue('first plus second');
  });

  test('a fresh edit cancels a pending retry and restarts the debounce', async ({ page }) => {
    await createHandwrittenDoc(page, 'Cancel Retry Test');

    await page.evaluate(() => {
      localStorage.setItem('scribe-steel-mock-fail-next', 'save:500');
    });

    await visibleTitleInput(page).pressSequentially('first', { delay: 10 });
    await expect(page.getByRole('status')).toContainText('attempt 2');

    // Type more — the banner should clear immediately because the new edit
    // takes priority over the queued retry. The next save (after debounce)
    // succeeds against the mock since the failure flag was already consumed.
    await visibleTitleInput(page).pressSequentially(' more', { delay: 10 });
    await expect(page.getByRole('status')).toBeHidden();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
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
