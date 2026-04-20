import { Users } from 'lucide-react';
import { MonsterGroupForm } from '@/components/forms/MonsterGroupForm';
import type { DocumentMetaFields, Feature, Monster } from '@/data/types';
import type { DocumentMetadata } from './types';

export interface MonsterGroupDocument extends DocumentMetaFields {
  version: number;
  name: string;
  malice: Feature[];
  monsters: Monster[];
}

export const monsterGroupsMetadata: DocumentMetadata<MonsterGroupDocument> = {
  category: 'monsters',
  noun: 'monster group',
  icon: Users,
  FormComponent: MonsterGroupForm,
  createDefault: (name) => ({
    version: 2,
    name,
    malice: [],
    monsters: [],
  }),
  indexFields: (data) => ({
    hasMalice: data.malice.length > 0,
    monsters: data.monsters.map((m) => ({
      name: m.name,
      level: m.level,
      roles: m.roles,
      ev: m.ev,
    })),
  }),
};
