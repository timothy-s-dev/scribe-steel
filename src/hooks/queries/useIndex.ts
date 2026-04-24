import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/services/google-auth';
import { loadIndex, type CachedDriveIndex } from '@/services/google-drive';
import { getStaticEntries } from './staticData';
import type { Category, IndexFile } from '@/data/types';

// Key shape for per-category index cache entries. Shared with the
// document mutation hooks (useSaveDocument / useDeleteDocument), which
// read the current entry before a mutation and write the updated entry
// back in onSuccess. isSignedIn participates in the key so signed-out
// and signed-in results don't share a cache entry (otherwise a stale
// signed-out fetch can freeze a signed-in view into a static-only list
// until manually invalidated).
export const indexQueryKey = (category: Category, isSignedIn: boolean) =>
  [category, 'index', isSignedIn] as const;

function emptyCache(): CachedDriveIndex {
  return { items: [], fileId: null, md5: null };
}

export function useIndex(category: Category, options?: { enabled?: boolean }) {
  const { isSignedIn } = useAuth();
  return useQuery<CachedDriveIndex, Error, IndexFile>({
    queryKey: indexQueryKey(category, isSignedIn),
    queryFn: async () => {
      if (!getAccessToken()) return emptyCache();
      return loadIndex(category);
    },
    // The cache holds the raw Drive-side state (plus fileId/md5 for the
    // service layer's md5 concurrency check on mutation). The UI-facing
    // shape — static items layered in front of Drive items — is derived
    // here so consumers keep the IndexFile contract without the cache
    // having to duplicate static data.
    select: (cached): IndexFile => ({
      items: [
        ...getStaticEntries(category),
        ...cached.items.map((item) => ({ ...item, custom: true })),
      ],
    }),
    // 15 minutes. The app is effectively the only writer, so we keep this
    // long enough that intra-session navigation feels instant, but short
    // enough that cross-device edits (phone during a game, laptop while
    // travelling) get picked up when the user returns to a long-idle tab.
    staleTime: 15 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
