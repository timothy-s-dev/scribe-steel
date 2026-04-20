import { PenTool } from 'lucide-react';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import { generatePreamble, type TemplateSchema } from '@/typst/templateSchema';
import { HandwrittenForm } from '@/components/forms/HandwrittenForm';
import type { DocumentMetadata, TemplateDocument } from './types';

export type HandwrittenDocument = TemplateDocument;

export const handwrittenSchema: TemplateSchema = {
  name: 'Handwritten Note',
  importPath: '/templates/handwritten.typ',
  functionName: 'handwritten',
  params: [
    { key: 'title', label: 'Title', type: 'string', optional: true },
  ],
  files: [
    { path: '/templates/handwritten.typ', content: handwrittenTyp },
  ],
};

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
  buildSource: (data) => ({
    source: generatePreamble(handwrittenSchema, data.params) + data.body,
    files: handwrittenSchema.files,
  }),
};
