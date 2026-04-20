import { BookOpen } from 'lucide-react';
import type { DocumentMetadata, TemplateDocument } from './types';

export type LoreBookDocument = TemplateDocument;

export const loreBooksMetadata: DocumentMetadata<LoreBookDocument> = {
  category: 'lore-books',
  noun: 'lore book',
  listTitle: 'Lore Books',
  icon: BookOpen,
  demoEnabled: true,
  template: 'lore-books',
  createDefault: () => ({
    version: 1,
    template: 'lore-books',
    params: {
      title: '',
      category: '',
      epigraph: '',
      'epigraph-attribution': '',
      description: '',
    },
    body: '',
  }),
};
