import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { LettersAndNotesPage } from '@/pages/LettersAndNotesPage';
import { LettersAndNotesEditorPage } from '@/pages/LettersAndNotesEditorPage';
import { LoreBooksPage } from '@/pages/LoreBooksPage';
import { LoreBooksEditorPage } from '@/pages/LoreBooksEditorPage';
import { MonsterCardsPage } from '@/pages/MonsterCardsPage';
import { EncounterSheetsPage } from '@/pages/EncounterSheetsPage';
import { EncounterSheetEditorPage } from '@/pages/EncounterSheetEditorPage';
import { MonsterGroupsPage } from '@/pages/MonsterGroupsPage';
import { MonsterGroupsEditorPage } from '@/pages/MonsterGroupsEditorPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';

function App() {
  return (
    <BrowserRouter>
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
