// ── Storage types ────────────────────────────────────────────────────────────

export type Category = 'monsters' | 'encounters' | 'handwritten' | 'lore-books' | 'monster-cards';

export interface IndexItem {
  fileId: string;
  name: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IndexFile {
  version: number;
  items: IndexItem[];
}

// Fields present on every saved document. `version` and `name` are required
// (set at creation); `updatedAt` is stamped in by the save path.
export interface DocumentMetaFields {
  version: number;
  name: string;
  updatedAt?: string;
}

