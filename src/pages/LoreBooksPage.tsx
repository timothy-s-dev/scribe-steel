import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BookOpen } from 'lucide-react';

export function LoreBooksPage() {
  usePageTitle('Lore Books');
  return (
    <DocumentList
      category="lore-books"
      basePath="/lore-books"
      title="Lore Books"
      icon={BookOpen}
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
