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

