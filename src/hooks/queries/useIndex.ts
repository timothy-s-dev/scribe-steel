import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/google-auth';
import { loadIndex } from '@/services/google-drive';
import { getStaticEntries } from './staticData';
import type { Category, IndexFile } from '@/data/types';

export function useIndex(category: Category, options?: { enabled?: boolean }) {
  const { isSignedIn } = useAuth();
  return useQuery<IndexFile>({
    // isSignedIn participates in the key so signed-out and signed-in results
    // don't share a cache entry (otherwise a stale signed-out fetch can
    // freeze a signed-in view into a static-only list until manually
    // invalidated).
    queryKey: [category, 'index', isSignedIn],
    queryFn: async () => {
      const staticItems = getStaticEntries(category);
      if (!getAccessToken()) return { version: 1, items: staticItems };
      const driveIndex = await loadIndex(category);
      const driveItems = driveIndex.items.map((item) => ({ ...item, custom: true }));
      return { version: driveIndex.version, items: [...staticItems, ...driveItems] };
    },
    enabled: options?.enabled ?? true,
  });
}
