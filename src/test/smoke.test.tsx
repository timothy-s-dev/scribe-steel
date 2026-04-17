import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/layouts/AppLayout';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const MonsterCardsPage = lazy(() => import('@/pages/MonsterCardsPage').then(m => ({ default: m.MonsterCardsPage })));
const EncounterSheetsPage = lazy(() => import('@/pages/EncounterSheetsPage').then(m => ({ default: m.EncounterSheetsPage })));
const MonsterGroupsPage = lazy(() => import('@/pages/MonsterGroupsPage').then(m => ({ default: m.MonsterGroupsPage })));
const LettersAndNotesPage = lazy(() => import('@/pages/LettersAndNotesPage').then(m => ({ default: m.LettersAndNotesPage })));
const LoreBooksPage = lazy(() => import('@/pages/LoreBooksPage').then(m => ({ default: m.LoreBooksPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function TestApp({ route }: { route: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Suspense>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="monster-cards" element={<MonsterCardsPage />} />
                <Route path="encounter-sheets" element={<EncounterSheetsPage />} />
                <Route path="monster-groups" element={<MonsterGroupsPage />} />
                <Route path="letters-and-notes" element={<LettersAndNotesPage />} />
                <Route path="lore-books" element={<LoreBooksPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="privacy" element={<PrivacyPolicyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('App smoke tests', () => {
  it('renders the home page', async () => {
    render(<TestApp route="/" />);
    const main = await screen.findByRole('main');
    expect(within(main).getByRole('heading', { name: 'Scribe Steel' })).toBeInTheDocument();
  });

  it('renders the monster cards page', async () => {
    render(<TestApp route="/monster-cards" />);
    const main = await screen.findByRole('main');
    const matches = await within(main).findAllByText('Monster Cards');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('renders the encounter sheets page', async () => {
    render(<TestApp route="/encounter-sheets" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Encounter Sheets' })).toBeInTheDocument();
  });

  it('renders the monster groups page', async () => {
    render(<TestApp route="/monster-groups" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Monster Groups' })).toBeInTheDocument();
  });

  it('renders the letters and notes page', async () => {
    render(<TestApp route="/letters-and-notes" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Letters and Notes' })).toBeInTheDocument();
  });

  it('renders the lore books page', async () => {
    render(<TestApp route="/lore-books" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Lore Books' })).toBeInTheDocument();
  });

  it('renders the settings page', async () => {
    render(<TestApp route="/settings" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders the privacy policy page', async () => {
    render(<TestApp route="/privacy" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', async () => {
    render(<TestApp route="/nonexistent" />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByText('Page not found')).toBeInTheDocument();
  });

  it('sets the page title on navigation', async () => {
    render(<TestApp route="/settings" />);
    const main = await screen.findByRole('main');
    await within(main).findByRole('heading', { name: 'Settings' });
    expect(document.title).toBe('Settings | Scribe Steel');
  });
});
