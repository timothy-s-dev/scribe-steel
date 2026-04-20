import type { LucideIcon } from 'lucide-react';
import type { Category, DocumentMetaFields } from '@/data/types';
import type { EncounterDocument } from './encounters';
import type { MonsterGroupDocument } from './monster-groups';

export interface DocumentMetadata<Data> {
  category: Category;
  noun: string;
  listTitle: string;
  icon: LucideIcon;
  demoEnabled?: boolean;
  template?: string;
  createDefault: (name: string) => Data;
  indexFields?(data: Data): Record<string, unknown>;
}

export interface Document<Data> {
  metadata: DocumentMetadata<Data>;
  data: Data;
  fileId: string;
}

export interface TemplateDocument extends DocumentMetaFields {
  version: number;
  template: string;
  params: Record<string, string>;
  body: string;
}

export interface DocumentDataByCategory {
  handwritten: TemplateDocument;
  'lore-books': TemplateDocument;
  encounters: EncounterDocument;
  monsters: MonsterGroupDocument;
}
