import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DocumentList } from '@/pages/DocumentListPage';
import { EditorPage } from '@/components/EditorPage';
import { handwrittenMetadata } from '@/data/documents/handwritten';
import { loreBooksMetadata } from '@/data/documents/lore-books';
import { encountersMetadata } from '@/data/documents/encounters';
import { monsterGroupsMetadata } from '@/data/documents/monster-groups';
import { monsterCardsMetadata } from '@/data/documents/monster-cards';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense>
          <Routes>
            {/* Outside AppLayout — popup window, no chrome needed. Closes itself. */}
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="monster-cards" element={<EditorPage type={monsterCardsMetadata} forceDemo hideBackButton hideTitleBar />} />
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
