import { PenTool } from 'lucide-react';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import { HandwrittenForm } from '@/components/forms/HandwrittenForm';
import { jsonBackedBuildSource } from '@/typst/preamble';
import type { DocumentMetadata, TemplateDocument } from './types';

export type HandwrittenDocument = TemplateDocument;

const IMPORT_PATH = '/templates/handwritten.typ';

export const handwrittenMetadata: DocumentMetadata<HandwrittenDocument> = {
  category: 'handwritten',
  noun: 'handwritten document',
  icon: PenTool,
  demoEnabled: true,
  FormComponent: HandwrittenForm,
  createDefault: (name) => ({
    version: 1,
    name,
    title: name,
    content: '',
  }),
  buildSource: jsonBackedBuildSource<HandwrittenDocument>({
    importPath: IMPORT_PATH,
    functionName: 'handwritten',
    templateFiles: [{ path: IMPORT_PATH, content: handwrittenTyp }],
  }),
};
