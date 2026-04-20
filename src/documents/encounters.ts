import { Swords } from 'lucide-react';
import encounterTyp from '@/typst/templates/encounter.typ?raw';
import { EncounterForm } from '@/components/forms/EncounterForm';
import { jsonBackedBuildSource } from '@/typst/preamble';
import type { DocumentMetaFields } from '@/data/types';
import type { DocumentMetadata } from './types';

const IMPORT_PATH = '/templates/encounter.typ';

export interface EncounterDocument extends DocumentMetaFields {
  title: string;
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
  content: string;
}

export const encountersMetadata: DocumentMetadata<EncounterDocument> = {
  category: 'encounters',
  noun: 'encounter sheet',
  icon: Swords,
  demoEnabled: true,
  FormComponent: EncounterForm,
  createDefault: (name) => ({
    version: 1,
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
