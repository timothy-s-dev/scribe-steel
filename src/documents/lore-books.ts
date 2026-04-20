import { BookOpen } from 'lucide-react';
import lorebookTyp from '@/typst/templates/lorebook.typ?raw';
import { LoreBookForm } from '@/components/forms/LoreBookForm';
import { contentBlock, importLine, quoteString, showWith } from '@/typst/preamble';
import type { DocumentMetadata, TemplateDocument } from './types';

export type LoreBookDocument = TemplateDocument;

const IMPORT_PATH = '/templates/lorebook.typ';
const TEMPLATE_FILES = [{ path: IMPORT_PATH, content: lorebookTyp }];

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
  buildSource: (data) => {
    const p = data.params;
    const args: string[] = [];
    if (p.title) args.push(`  title: ${quoteString(p.title)}`);
    if (p.category) args.push(`  category: ${quoteString(p.category)}`);
    if (p.epigraph) args.push(`  epigraph: ${contentBlock(p.epigraph)}`);
    if (p['epigraph-attribution']) args.push(`  epigraph-attribution: ${quoteString(p['epigraph-attribution'])}`);
    if (p.description) args.push(`  description: ${contentBlock(p.description)}`);
    return {
      source: [importLine(IMPORT_PATH), showWith('lorebook', args), '', data.body].join('\n'),
      files: TEMPLATE_FILES,
    };
  },
};
