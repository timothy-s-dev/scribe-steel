import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { LettersAndNotesPage } from '@/pages/LettersAndNotesPage';
import { LettersAndNotesEditorPage } from '@/pages/LettersAndNotesEditorPage';
import { LoreBooksPage } from '@/pages/LoreBooksPage';
import { LoreBooksEditorPage } from '@/pages/LoreBooksEditorPage';
import { MonsterCardsPage } from '@/pages/MonsterCardsPage';
import { EncounterSheetPage } from '@/pages/EncounterSheetPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="monster-cards" element={<MonsterCardsPage />} />
          <Route path="encounter-sheet" element={<EncounterSheetPage />} />
          <Route path="letters-and-notes" element={<LettersAndNotesPage />} />
          <Route path="letters-and-notes/:fileId" element={<LettersAndNotesEditorPage />} />
          <Route path="lore-books" element={<LoreBooksPage />} />
          <Route path="lore-books/:fileId" element={<LoreBooksEditorPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
