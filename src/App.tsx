import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const MonsterCardsPage = lazy(() => import('@/pages/MonsterCardsPage').then(m => ({ default: m.MonsterCardsPage })));
const EncounterSheetsPage = lazy(() => import('@/pages/EncounterSheetsPage').then(m => ({ default: m.EncounterSheetsPage })));
const EncounterSheetEditorPage = lazy(() => import('@/pages/EncounterSheetEditorPage').then(m => ({ default: m.EncounterSheetEditorPage })));
const MonsterGroupsPage = lazy(() => import('@/pages/MonsterGroupsPage').then(m => ({ default: m.MonsterGroupsPage })));
const MonsterGroupsEditorPage = lazy(() => import('@/pages/MonsterGroupsEditorPage').then(m => ({ default: m.MonsterGroupsEditorPage })));
const LettersAndNotesPage = lazy(() => import('@/pages/LettersAndNotesPage').then(m => ({ default: m.LettersAndNotesPage })));
const LettersAndNotesEditorPage = lazy(() => import('@/pages/LettersAndNotesEditorPage').then(m => ({ default: m.LettersAndNotesEditorPage })));
const LoreBooksPage = lazy(() => import('@/pages/LoreBooksPage').then(m => ({ default: m.LoreBooksPage })));
const LoreBooksEditorPage = lazy(() => import('@/pages/LoreBooksEditorPage').then(m => ({ default: m.LoreBooksEditorPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="monster-cards" element={<MonsterCardsPage />} />
              <Route path="encounter-sheets" element={<EncounterSheetsPage />} />
              <Route path="encounter-sheets/:fileId" element={<EncounterSheetEditorPage />} />
              <Route path="monster-groups" element={<MonsterGroupsPage />} />
              <Route path="monster-groups/:fileId" element={<MonsterGroupsEditorPage />} />
              <Route path="letters-and-notes" element={<LettersAndNotesPage />} />
              <Route path="letters-and-notes/:fileId" element={<LettersAndNotesEditorPage />} />
              <Route path="lore-books" element={<LoreBooksPage />} />
              <Route path="lore-books/:fileId" element={<LoreBooksEditorPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
