import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';

export function LettersAndNotesPage() {
  usePageTitle('Letters & Notes');
  return (
    <DocumentList
      category="letters-and-notes"
      basePath="/letters-and-notes"
      title="Letters and Notes"
      icon="architecture"
      templateName="letters-and-notes"
      defaultParams={{ title: '' }}
      defaultBody=""
    />
  );
}
