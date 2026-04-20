import { BookOpen } from 'lucide-react';
import lorebookTyp from '@/typst/templates/lorebook.typ?raw';
import { generatePreamble, type TemplateSchema } from '@/typst/templateSchema';
import { LoreBookForm } from '@/components/forms/LoreBookForm';
import type { DocumentMetadata, TemplateDocument } from './types';

export type LoreBookDocument = TemplateDocument;

export const loreBookSchema: TemplateSchema = {
  name: 'Lore Book',
  importPath: '/templates/lorebook.typ',
  functionName: 'lorebook',
  params: [
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'category', label: 'Category', type: 'string', optional: true },
    { key: 'epigraph', label: 'Epigraph', type: 'content', optional: true },
    {
      key: 'epigraph-attribution',
      label: 'Epigraph Attribution',
      type: 'string',
      optional: true,
    },
    { key: 'description', label: 'Description', type: 'content', optional: true },
  ],
  files: [
    { path: '/templates/lorebook.typ', content: lorebookTyp },
  ],
};

export const loreBooksMetadata: DocumentMetadata<LoreBookDocument> = {
  category: 'lore-books',
  noun: 'lore book',
  icon: BookOpen,
  demoEnabled: true,
  FormComponent: LoreBookForm,
  createDefault: (name) => ({
    version: 1,
    name,
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
  buildSource: (data) => ({
    source: generatePreamble(loreBookSchema, data.params) + data.body,
    files: loreBookSchema.files,
  }),
};
