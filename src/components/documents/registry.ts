import type { ComponentType } from 'react';
import type { Category } from '@/data/types';
import type { DocumentDataByCategory } from '@/documents';
import type { CreateDialogProps } from './NameOnlyCreateDialog';
import { CreateHandwrittenDocumentDialog } from './CreateHandwrittenDocumentDialog';
import { CreateLoreBookDialog } from './CreateLoreBookDialog';
import { CreateEncounterDialog } from './CreateEncounterDialog';
import { CreateMonsterGroupDialog } from './CreateMonsterGroupDialog';

type CreateDialogRegistry = {
  [K in Category]: ComponentType<CreateDialogProps<DocumentDataByCategory[K]>>;
};

const registry: CreateDialogRegistry = {
  handwritten: CreateHandwrittenDocumentDialog,
  'lore-books': CreateLoreBookDialog,
  encounters: CreateEncounterDialog,
  monsters: CreateMonsterGroupDialog,
  'monster-cards': () => null,
};

export function getCreateDialog<Data>(category: Category): ComponentType<CreateDialogProps<Data>> {
  return registry[category] as ComponentType<CreateDialogProps<Data>>;
}
