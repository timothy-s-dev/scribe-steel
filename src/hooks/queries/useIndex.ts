import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '@/services/google-auth';
import { loadIndex } from '@/services/google-drive';
import { getStaticEntries } from './staticData';
import type { Category, IndexFile } from '@/data/types';

export function useIndex(category: Category) {
  return useQuery<IndexFile>({
    queryKey: [category, 'index'],
    queryFn: async () => {
      const staticItems = getStaticEntries(category);
      if (!getAccessToken()) return { version: 1, items: staticItems };
      const driveIndex = await loadIndex(category);
      const driveItems = driveIndex.items.map((item) => ({ ...item, custom: true }));
      return { version: driveIndex.version, items: [...staticItems, ...driveItems] };
    },
  });
}
