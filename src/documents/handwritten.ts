import { PenTool } from 'lucide-react';
import type { DocumentType, SavedTemplateDocument } from './types';

export const handwrittenDocument: DocumentType<SavedTemplateDocument> = {
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
