import { Skull } from 'lucide-react';
import monsterCardTyp from '@/typst/templates/monster-card.typ?raw';
import { MonsterCardForm } from '@/components/forms/MonsterCardForm';
import { jsonBackedBuildSource } from '@/typst/preamble';
import type { DocumentMetaFields, Monster } from '@/data/types';
import type { DocumentMetadata } from './types';

const IMPORT_PATH = '/templates/monster-card.typ';

export interface MonsterCardsDocument extends DocumentMetaFields {
  title: string;
  monsters: Monster[];
  content: string;
}

export const monsterCardsMetadata: DocumentMetadata<MonsterCardsDocument> = {
  category: 'monster-cards',
  noun: 'monster card set',
  sectionTitle: 'Monster Cards',
  icon: Skull,
  FormComponent: MonsterCardForm,
  createDefault: () => ({
    version: 1,
    name: 'Monster Cards',
    title: 'Monster Cards',
    monsters: [],
    content: '',
  }),
  indexFields: (data) => ({ monsterCount: data.monsters.length }),
  buildSource: jsonBackedBuildSource<MonsterCardsDocument>({
    importPath: IMPORT_PATH,
    functionName: 'monster-card-sheet',
    templateFiles: [{ path: IMPORT_PATH, content: monsterCardTyp }],
  }),
};
