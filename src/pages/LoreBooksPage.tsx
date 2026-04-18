import { DocumentList } from '@/components/DocumentList';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BookOpen } from 'lucide-react';

export function LoreBooksPage() {
  usePageTitle('Lore Books');
  return (
    <DocumentList
      category="lore-books"
      title="Lore Books"
      icon={BookOpen}
      itemNoun="lore book"
      demoEnabled
      createDocument={() => ({
        data: {
          version: 1,
          template: 'lore-books',
          params: {
            title: '',
            category: '',
            epigraph: '',
            'epigraph-attribution': '',
            description: '',
          },
          body: '',
        },
      })}
    />
  );
}
