import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { handwrittenDocument } from '@/documents/handwritten';
import { loreBooksDocument } from '@/documents/lore-books';
import { encountersDocument } from '@/documents/encounters';
import { monsterGroupsDocument } from '@/documents/monster-groups';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const MonsterCardsPage = lazy(() => import('@/pages/MonsterCardsPage').then(m => ({ default: m.MonsterCardsPage })));
const DocumentList = lazy(() => import('@/components/DocumentList').then(m => ({ default: m.DocumentList })));
const EncounterSheetEditorPage = lazy(() => import('@/pages/EncounterSheetEditorPage').then(m => ({ default: m.EncounterSheetEditorPage })));
const MonsterGroupsEditorPage = lazy(() => import('@/pages/MonsterGroupsEditorPage').then(m => ({ default: m.MonsterGroupsEditorPage })));
const HandwrittenDocumentEditorPage = lazy(() => import('@/pages/HandwrittenDocumentEditorPage').then(m => ({ default: m.HandwrittenDocumentEditorPage })));
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
              <Route path="encounter-sheets" element={<DocumentList type={encountersDocument} />} />
              <Route path="encounter-sheets/:fileId" element={<EncounterSheetEditorPage />} />
              <Route path="monster-groups" element={<DocumentList type={monsterGroupsDocument} />} />
              <Route path="monster-groups/:fileId" element={<MonsterGroupsEditorPage />} />
              <Route path="handwritten" element={<DocumentList type={handwrittenDocument} />} />
              <Route path="handwritten/:fileId" element={<HandwrittenDocumentEditorPage />} />
              <Route path="lore-books" element={<DocumentList type={loreBooksDocument} />} />
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
