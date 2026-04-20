import { PenTool } from 'lucide-react';
import type { DocumentMetadata, TemplateDocument } from './types';

export type HandwrittenDocument = TemplateDocument;

export const handwrittenMetadata: DocumentMetadata<HandwrittenDocument> = {
  category: 'handwritten',
  noun: 'handwritten document',
  listTitle: 'Handwritten',
  icon: PenTool,
  demoEnabled: true,
  template: 'handwritten',
  createDefault: () => ({
    version: 1,
    template: 'handwritten',
    params: { title: '' },
    body: '',
  }),
};
