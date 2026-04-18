import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Swords } from 'lucide-react';
import type { SavedEncounter } from '@/data/types';

export function EncounterSheetsPage() {
  usePageTitle('Encounter Sheets');
  return (
    <DocumentList
      category="encounters"
      title="Encounter Sheets"
      icon={Swords}
      itemNoun="encounter"
      demoEnabled
      createDocument={(name) => {
        const data: SavedEncounter = {
          version: 1,
          encounter: name,
          objective: '',
          victory: '',
          failure: '',
          malice: [],
          groups: [],
          notes: '',
        };
        return { data };
      }}
    />
  );
}
