import { Swords } from 'lucide-react';
import encounterTyp from '@/typst/templates/encounter.typ?raw';
import { EncounterForm } from '@/components/forms/EncounterForm';
import type { VirtualFile } from '@/typst/compiler';
import type { DocumentMetaFields } from '@/data/types';
import type { DocumentMetadata } from './types';

const TEMPLATE_FILE: VirtualFile = {
  path: '/templates/encounter.typ',
  content: encounterTyp,
};

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
    const lines = [
      '#import "/templates/encounter.typ": *',
      '#let _data = json("/data/encounter.json")',
      '#show: encounter-sheet.with(',
      '  encounter: _data.name,',
      '  objective: _data.objective,',
      '  victory: _data.victory,',
      '  failure: _data.failure,',
      '  malice: _data.malice,',
      '  groups: _data.groups,',
      ')',
      '',
    ];
    if (data.notes.trim()) lines.push(data.notes);
    return {
      source: lines.join('\n'),
      files: [
        TEMPLATE_FILE,
        { path: '/data/encounter.json', content: JSON.stringify(payload) },
      ],
    };
  },
};
