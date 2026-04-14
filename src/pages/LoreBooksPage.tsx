import { DocumentList } from '@/components/DocumentList';

export function LoreBooksPage() {
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
