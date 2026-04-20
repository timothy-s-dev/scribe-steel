import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DocumentList } from '@/components/DocumentList';
import { EditorPage } from '@/components/EditorPage';
import { handwrittenMetadata } from '@/documents/handwritten';
import { loreBooksMetadata } from '@/documents/lore-books';
import { encountersMetadata } from '@/documents/encounters';
import { monsterGroupsMetadata } from '@/documents/monster-groups';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const MonsterCardsPage = lazy(() => import('@/pages/MonsterCardsPage').then(m => ({ default: m.MonsterCardsPage })));
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
              <Route path="encounter-sheets" element={<DocumentList type={encountersMetadata} />} />
              <Route path="encounter-sheets/:fileId" element={<EditorPage type={encountersMetadata} />} />
              <Route path="monster-groups" element={<DocumentList type={monsterGroupsMetadata} />} />
              <Route path="monster-groups/:fileId" element={<EditorPage type={monsterGroupsMetadata} />} />
              <Route path="handwritten" element={<DocumentList type={handwrittenMetadata} />} />
              <Route path="handwritten/:fileId" element={<EditorPage type={handwrittenMetadata} />} />
              <Route path="lore-books" element={<DocumentList type={loreBooksMetadata} />} />
              <Route path="lore-books/:fileId" element={<EditorPage type={loreBooksMetadata} />} />
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
