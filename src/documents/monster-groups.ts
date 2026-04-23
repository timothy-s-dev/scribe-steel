import { Users } from 'lucide-react';
import { MonsterGroupForm } from '@/components/forms/MonsterGroupForm';
import type { DocumentMetaFields } from '@/data/types';
import type { Feature, Monster } from '@/data/bestiary';
import type { DocumentMetadata } from './types';

export interface MonsterGroupDocument extends DocumentMetaFields {
  malice: Feature[];
  monsters: Monster[];
}

export const monsterGroupsMetadata: DocumentMetadata<MonsterGroupDocument> = {
  category: 'monsters',
  noun: 'monster group',
  icon: Users,
  FormComponent: MonsterGroupForm,
  createDefault: (name) => ({
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
