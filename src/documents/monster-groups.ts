import { Users } from 'lucide-react';
import type { SavedMonsterGroup } from '@/data/types';
import type { DocumentType } from './types';

export const monsterGroupsDocument: DocumentType<SavedMonsterGroup> = {
  category: 'monsters',
  noun: 'monster group',
  listTitle: 'Monster Groups',
  icon: Users,
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
