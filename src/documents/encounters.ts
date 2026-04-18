import { Swords } from 'lucide-react';
import type { SavedEncounter } from '@/data/types';
import type { DocumentType } from './types';

export const encountersDocument: DocumentType<SavedEncounter> = {
  category: 'encounters',
  noun: 'encounter',
  listTitle: 'Encounter Sheets',
  icon: Swords,
  demoEnabled: true,
  createDefault: (name) => ({
    version: 1,
    encounter: name,
    objective: '',
    victory: '',
    failure: '',
    malice: [],
    groups: [],
    notes: '',
  }),
};
