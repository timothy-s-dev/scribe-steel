import { Swords } from 'lucide-react';
import type { DocumentMetaFields } from '@/data/types';
import type { DocumentMetadata } from './types';

export interface EncounterDocument extends DocumentMetaFields {
  version: number;
  encounter: string;
  objective: string;
  victory: string;
  failure: string;
  malice: { cost: number; name: string; description: string }[];
  groups: {
    label: string;
    creatures: {
      name: string;
      stamina: string;
      stability: number;
      speed: number;
      freeStrike: string;
      distance: string;
      notes: string;
      count?: number;
    }[];
  }[];
  notes: string;
}

export const encountersMetadata: DocumentMetadata<EncounterDocument> = {
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
