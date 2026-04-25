export type { DocumentMetadata, Document, DocumentDataByCategory, TemplateDocument } from './types';
export { handwrittenMetadata, type HandwrittenDocument } from './handwritten';
export { loreBooksMetadata, type LoreBookDocument } from './lore-books';
export { encountersMetadata, type EncounterDocument } from './encounters';
export { monsterGroupsMetadata, type MonsterGroupDocument } from './monster-groups';
export { monsterCardsMetadata, type MonsterCardsDocument } from './monster-cards';

import type { Category } from '@/data/documents/types';
import type { DocumentMetadata } from './types';
import { handwrittenMetadata } from './handwritten';
import { loreBooksMetadata } from './lore-books';
import { encountersMetadata } from './encounters';
import { monsterGroupsMetadata } from './monster-groups';
import { monsterCardsMetadata } from './monster-cards';

// Category → metadata lookup for code paths that resolve metadata from a
// runtime category (e.g. synthesizing a demo document via createDefault
// inside the query layer). The data generic widens to `any` because the
// per-category parameterization is encoded in the key, not reified at
// runtime — callers that need precise typing should use the named exports.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const documentMetadataByCategory: Record<Category, DocumentMetadata<any>> = {
  handwritten: handwrittenMetadata,
  'lore-books': loreBooksMetadata,
  encounters: encountersMetadata,
  monsters: monsterGroupsMetadata,
  'monster-cards': monsterCardsMetadata,
};
