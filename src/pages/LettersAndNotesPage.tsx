import { DocumentList } from '@/components/DocumentList';

export function LettersAndNotesPage() {
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
