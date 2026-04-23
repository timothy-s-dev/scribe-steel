import { BookOpen } from 'lucide-react';
import lorebookTyp from '@/typst/templates/lorebook.typ?raw';
import { LoreBookForm } from '@/components/forms/LoreBookForm';
import { jsonBackedBuildSource } from '@/typst/preamble';
import type { DocumentMetadata, TemplateDocument } from './types';

export interface LoreBookDocument extends TemplateDocument {
  category: string;
  epigraph: string;
  epigraphAttribution: string;
  description: string;
}

const IMPORT_PATH = '/templates/lorebook.typ';

export const loreBooksMetadata: DocumentMetadata<LoreBookDocument> = {
  category: 'lore-books',
  noun: 'lore book',
  icon: BookOpen,
  demoEnabled: true,
  FormComponent: LoreBookForm,
  createDefault: (name) => ({
    name,
    title: name,
    category: '',
    epigraph: '',
    epigraphAttribution: '',
    description: '',
    content: '',
  }),
  buildSource: jsonBackedBuildSource<LoreBookDocument>({
    importPath: IMPORT_PATH,
    functionName: 'lorebook',
    templateFiles: [{ path: IMPORT_PATH, content: lorebookTyp }],
  }),
};
