import { Swords } from 'lucide-react';
import encounterTyp from '@/lib/typst/templates/encounter.typ?raw';
import { EncounterForm } from '@/components/forms/EncounterForm';
import { jsonBackedBuildSource } from '@/lib/typst/preamble';
import type { DocumentMetaFields } from '@/data/documents/types';
import type { DocumentMetadata } from './types';

const IMPORT_PATH = '/templates/encounter.typ';

export interface EncounterMalice {
  id: string;
  cost: number;
  name: string;
  description: string;
}

export interface EncounterCreature {
  id: string;
  name: string;
  stamina: string;
  stability: number;
  speed: number;
  freeStrike: string;
  distance: string;
  notes: string;
  count?: number;
}

export interface EncounterGroup {
  id: string;
  label: string;
  creatures: EncounterCreature[];
}

export interface EncounterDocument extends DocumentMetaFields {
  title: string;
  objective: string;
  victory: string;
  failure: string;
  malice: EncounterMalice[];
  groups: EncounterGroup[];
  content: string;
}

export function emptyCreature(): EncounterCreature {
  return {
    id: crypto.randomUUID(),
    name: '',
    stamina: '',
    stability: 0,
    speed: 5,
    freeStrike: '',
    distance: 'Melee 1',
    notes: '',
  };
}

export function emptyGroup(): EncounterGroup {
  return { id: crypto.randomUUID(), label: '', creatures: [emptyCreature()] };
}

export function emptyMalice(): EncounterMalice {
  return { id: crypto.randomUUID(), cost: 3, name: '', description: '' };
}

export const encountersMetadata: DocumentMetadata<EncounterDocument> = {
  category: 'encounters',
  noun: 'encounter sheet',
  icon: Swords,
  demoEnabled: true,
  FormComponent: EncounterForm,
  createDefault: (name) => ({
    name,
    title: name,
    objective: '',
    victory: '',
    failure: '',
    malice: [],
    groups: [],
    content: '',
  }),
  buildSource: jsonBackedBuildSource<EncounterDocument>({
    importPath: IMPORT_PATH,
    functionName: 'encounter-sheet',
    templateFiles: [{ path: IMPORT_PATH, content: encounterTyp }],
  }),
};
