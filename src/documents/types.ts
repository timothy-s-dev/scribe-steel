import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Category, DocumentMetaFields } from '@/data/types';
import type { VirtualFile } from '@/typst/compiler';
import type { EncounterDocument } from './encounters';
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
