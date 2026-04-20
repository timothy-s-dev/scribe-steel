import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Category, DocumentMetaFields } from '@/data/types';
import type { VirtualFile } from '@/typst/compiler';
import type { EncounterDocument } from './encounters';
import type { HandwrittenDocument } from './handwritten';
import type { LoreBookDocument } from './lore-books';
import type { MonsterGroupDocument } from './monster-groups';

export interface DocumentFormProps<Data> {
  initialSaved: Data;
  onChange: (saved: Data) => void;
}

export interface DocumentMetadata<Data> {
  category: Category;
  noun: string;
  icon: LucideIcon;
  demoEnabled?: boolean;
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
  version: number;
  name: string;
  title: string;
  content: string;
}

export interface DocumentDataByCategory {
  handwritten: HandwrittenDocument;
  'lore-books': LoreBookDocument;
  encounters: EncounterDocument;
  monsters: MonsterGroupDocument;
}
