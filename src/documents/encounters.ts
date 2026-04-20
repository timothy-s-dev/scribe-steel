import { Swords } from 'lucide-react';
import encounterTyp from '@/typst/templates/encounter.typ?raw';
import { EncounterForm } from '@/components/forms/EncounterForm';
import { importLine, showWith } from '@/typst/preamble';
import type { DocumentMetaFields } from '@/data/types';
import type { DocumentMetadata } from './types';

const IMPORT_PATH = '/templates/encounter.typ';
const PAYLOAD_PATH = '/data/encounter.json';

export interface EncounterDocument extends DocumentMetaFields {
  version: number;
  name: string;
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

function stripMetadata(data: EncounterDocument): Omit<EncounterDocument, 'updatedAt'> {
  const { updatedAt: _ignored, ...rest } = data;
  return rest;
}

export const encountersMetadata: DocumentMetadata<EncounterDocument> = {
  category: 'encounters',
  noun: 'encounter sheet',
  icon: Swords,
  demoEnabled: true,
  createDefault: (name) => ({
    version: 1,
    name,
    objective: '',
    victory: '',
    failure: '',
    malice: [],
    groups: [],
    notes: '',
  }),
  FormComponent: EncounterForm,
  buildSource: (data) => {
    const payload = stripMetadata(data);
    const args = [
      '  encounter: _data.name',
      '  objective: _data.objective',
      '  victory: _data.victory',
      '  failure: _data.failure',
      '  malice: _data.malice',
      '  groups: _data.groups',
    ];
    const source = [
      importLine(IMPORT_PATH),
      `#let _data = json("${PAYLOAD_PATH}")`,
      showWith('encounter-sheet', args),
      '',
      data.notes.trim() ? data.notes : '',
    ].join('\n');
    return {
      source,
      files: [
        { path: IMPORT_PATH, content: encounterTyp },
        { path: PAYLOAD_PATH, content: JSON.stringify(payload) },
      ],
    };
  },
};
