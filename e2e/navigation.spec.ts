import { test, expect } from './fixtures';

// Sidebar nav entries that route inside the app (bug-report and release-notes
// go to external URLs, so they aren't covered here).
const sidebarLinks = [
  { name: 'Handwritten', path: '/handwritten' },
  { name: 'Lore Books', path: '/lore-books' },
  { name: 'Monster Groups', path: '/monster-groups' },
  { name: 'Monster Cards', path: '/monster-cards' },
  { name: 'Encounter Sheets', path: '/encounter-sheets' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Settings', path: '/settings' },
] as const;

const homeTiles = [
  { name: 'Handwritten', path: '/handwritten' },
  { name: 'Lore Books', path: '/lore-books' },
  { name: 'Monster Cards', path: '/monster-cards' },
  { name: 'Encounter Sheets', path: '/encounter-sheets' },
] as const;

test.describe('Navigation', () => {
  test.describe('Sidebar links (desktop)', () => {
    for (const link of sidebarLinks) {
      test(`"${link.name}" routes to ${link.path}`, async ({ page }) => {
        await page.goto('/');
        await page.getByRole('complementary').getByRole('link', { name: link.name }).click();
        await expect(page).toHaveURL(link.path);
      });
    }
  });

  test.describe('Home-page tiles', () => {
    for (const tile of homeTiles) {
      test(`"${tile.name}" tile routes to ${tile.path}`, async ({ page }) => {
        await page.goto('/');
        // Each ToolCard has a heading with the tool's name and an "Open" link
        // pointing at its route. Scope by href so we target the intended tile.
        await page.locator('#main-content').locator(`a[href="${tile.path}"]`).click();
        await expect(page).toHaveURL(tile.path);
      });
    }
  });

  test('unknown route renders the NotFoundPage', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('deep-link + reload preserves the editor route', async ({ page }) => {
    // The `demo` fileId is the temp-doc path every editor supports without auth.
    await page.goto('/encounter-sheets/demo');
    await expect(page).toHaveURL('/encounter-sheets/demo');
    await page.reload();
    await expect(page).toHaveURL('/encounter-sheets/demo');
  });

  test('browser back/forward move through route history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('complementary').getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');

    await page.goBack();
    await expect(page).toHaveURL('/');

    await page.goForward();
    await expect(page).toHaveURL('/settings');
  });

  test.describe('Mobile nav drawer', () => {
    // Mobile viewport triggers the hamburger layout (md breakpoint is 768px).
    test.use({ viewport: { width: 390, height: 844 } });

    test('hamburger opens, close button closes', async ({ page }) => {
      await page.goto('/');

      const drawerHeading = page.getByRole('heading', { name: 'Scribe Steel', level: 1 });
      await expect(drawerHeading).toHaveCount(0); // sidebar is hidden in mobile

      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(drawerHeading).toBeVisible();

      await page.getByRole('button', { name: 'Close menu' }).click();
      await expect(drawerHeading).toHaveCount(0);
    });

    test('tapping a nav link inside the drawer closes it and routes', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Open menu' }).click();

      // Drawer must be open before we click a link inside it.
      const drawer = page.getByRole('complementary');
      await expect(drawer).toBeVisible();

      await drawer.getByRole('link', { name: 'Settings' }).click();

      await expect(page).toHaveURL('/settings');
      // Drawer should have closed itself via onNavigate.
      await expect(page.getByRole('complementary')).toHaveCount(0);
    });
  });
});
