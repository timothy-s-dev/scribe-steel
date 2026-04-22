import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Category, DocumentMetaFields } from '@/data/types';
import type { VirtualFile } from '@/typst/compiler';
import type { EncounterDocument } from './encounters';
import type { HandwrittenDocument } from './handwritten';
import type { LoreBookDocument } from './lore-books';
import type { MonsterCardsDocument } from './monster-cards';
import type { MonsterGroupDocument } from './monster-groups';

export interface DocumentFormProps<Data> {
  value: Data;
  onChange: (next: Data) => void;
}

export interface DocumentMetadata<Data> {
  category: Category;
  noun: string;
  icon: LucideIcon;
  demoEnabled?: boolean;
  sectionTitle?: string;
  createDefault: (name: string) => Data;
  indexFields?(data: Data): Record<string, unknown>;
  buildSource?(data: Data): { source: string; files: VirtualFile[] };
  FormComponent: ComponentType<DocumentFormProps<Data>>;
}

export interface Document<Data> {
  metadata: DocumentMetadata<Data>;
  data: Data;
  fileId: string;
}

export interface TemplateDocument extends DocumentMetaFields {
  title: string;
  content: string;
}

export interface DocumentDataByCategory {
  handwritten: HandwrittenDocument;
  'lore-books': LoreBookDocument;
  encounters: EncounterDocument;
  monsters: MonsterGroupDocument;
  'monster-cards': MonsterCardsDocument;
}
