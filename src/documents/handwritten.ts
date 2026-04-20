import { PenTool } from 'lucide-react';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import { HandwrittenForm } from '@/components/forms/HandwrittenForm';
import { importLine, quoteString, showWith } from '@/typst/preamble';
import type { DocumentMetadata, TemplateDocument } from './types';

export type HandwrittenDocument = TemplateDocument;

const IMPORT_PATH = '/templates/handwritten.typ';
const TEMPLATE_FILES = [{ path: IMPORT_PATH, content: handwrittenTyp }];

export const handwrittenMetadata: DocumentMetadata<HandwrittenDocument> = {
  category: 'handwritten',
  noun: 'handwritten document',
  icon: PenTool,
  demoEnabled: true,
  FormComponent: HandwrittenForm,
  createDefault: (name) => ({
    version: 1,
    name,
    template: 'handwritten',
    params: { title: '' },
    body: '',
  }),
  buildSource: (data) => {
    const args: string[] = [];
    if (data.params.title) args.push(`  title: ${quoteString(data.params.title)}`);
    return {
      source: [importLine(IMPORT_PATH), showWith('handwritten', args), '', data.body].join('\n'),
      files: TEMPLATE_FILES,
    };
  },
};
