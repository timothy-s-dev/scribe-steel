import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PenTool } from 'lucide-react';

export function LettersAndNotesPage() {
  usePageTitle('Letters & Notes');
  return (
    <DocumentList
      category="letters-and-notes"
      basePath="/letters-and-notes"
      title="Letters and Notes"
      icon={PenTool}
      templateName="letters-and-notes"
      defaultParams={{ title: '' }}
      defaultBody=""
    />
  );
}
