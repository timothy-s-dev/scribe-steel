import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { LettersAndNotesPage } from '@/pages/LettersAndNotesPage';
import { LoreBooksPage } from '@/pages/LoreBooksPage';
import { MonsterCardsPage } from '@/pages/MonsterCardsPage';
import { EncounterSheetPage } from '@/pages/EncounterSheetPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="monster-cards" element={<MonsterCardsPage />} />
          <Route path="encounter-sheet" element={<EncounterSheetPage />} />
          <Route path="letters-and-notes" element={<LettersAndNotesPage />} />
          <Route path="lore-books" element={<LoreBooksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
