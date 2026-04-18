import type { LucideIcon } from 'lucide-react';
import type { Category, SavedEncounter, SavedMonsterGroup } from '@/data/types';

export interface DocumentType<Data> {
  category: Category;
  noun: string;
  listTitle: string;
  icon: LucideIcon;
  demoEnabled?: boolean;
  template?: string;
  createDefault: (name: string) => Data;
  indexFields?: (data: Data) => Record<string, unknown>;
}

export interface SavedTemplateDocument {
  version: number;
  template: string;
  params: Record<string, string>;
  body: string;
  updatedAt?: string;
}

export interface DocumentDataByCategory {
  handwritten: SavedTemplateDocument;
  'lore-books': SavedTemplateDocument;
  encounters: SavedEncounter;
  monsters: SavedMonsterGroup;
}
