import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PenTool } from 'lucide-react';

export function LettersAndNotesPage() {
  usePageTitle('Letters & Notes');
  return (
    <DocumentList
      category="letters-and-notes"
      title="Letters and Notes"
      icon={PenTool}
      itemNoun="letter"
      demoEnabled
      createDocument={() => ({
        data: {
          version: 1,
          template: 'letters-and-notes',
          params: { title: '' },
          body: '',
        },
      })}
    />
  );
}
