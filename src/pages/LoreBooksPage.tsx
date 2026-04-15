import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';

export function LoreBooksPage() {
  usePageTitle('Lore Books');
  return (
    <DocumentList
      category="lore-books"
      basePath="/lore-books"
      title="Lore Books"
      icon="auto_stories"
      templateName="lore-books"
      defaultParams={{
        title: '',
        category: '',
        epigraph: '',
        'epigraph-attribution': '',
        description: '',
      }}
      defaultBody=""
    />
  );
}
