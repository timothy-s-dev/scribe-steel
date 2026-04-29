import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { VirtualFile } from '@/lib/typst/compiler';
import type { EditorDiagnostic } from '@/hooks/useTypstCompiler';
import type { EncounterDocument } from './encounters';
import type { HandwrittenDocument } from './handwritten';
import type { LoreBookDocument } from './lore-books';
import type { MonsterCardsDocument } from './monster-cards';
import type { MonsterGroupDocument } from './monster-groups';

// ── Storage types ────────────────────────────────────────────────────────────

export type Category = 'monsters' | 'encounters' | 'handwritten' | 'lore-books' | 'monster-cards';

export interface IndexItem {
  fileId: string;
  name: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IndexFile {
  items: IndexItem[];
}

export interface DocumentMetaFields {
  name: string;
}

// ── Document-type registry ───────────────────────────────────────────────────

export interface DocumentFormProps<Data> {
  value: Data;
  onChange: (next: Data) => void;
  // Diagnostics produced by the most recent Typst compile. Only forms with
  // an embedded TypstEditor consume this; other forms can ignore it.
  editorDiagnostics?: EditorDiagnostic[];
}

export interface DocumentMetadata<Data> {
  category: Category;
  noun: string;
  icon: LucideIcon;
  demoEnabled?: boolean;
  sectionTitle?: string;
  createDefault: (name: string) => Data;
  indexFields?(data: Data): Record<string, unknown>;
  buildSource?(data: Data): {
    source: string;
    files: VirtualFile[];
    // For document types whose form embeds an editable Typst block: how
    // many lines of preamble precede the user-editable content within
    // `source`. Used to map Typst diagnostic line numbers back into
    // editor-local line numbers.
    userContentLineOffset?: number;
  };
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
