import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadDocument as loadDriveDocument,
  createDocument,
  updateDocument,
  removeDocument,
  type CachedDriveIndex,
} from '@/services/google-drive';
import { isVirtualId, loadStaticDocument, loadVirtualDocument } from './staticData';
import { indexQueryKey } from './useIndex';
import type { Category } from '@/data/documents/types';

// The cache stores { data, md5, source } for every document query. md5 is
// Drive's md5Checksum of the stored content — used for optimistic
// concurrency on save. We use md5 rather than Drive's `version` field
// because `version` reflects internal server bookkeeping (async metadata
// bumps) that doesn't correspond to actual content changes; md5 only
// moves when bytes change. `source` tags where the envelope came from so
// downstream callers (mutation hook, editor UI) can branch on
// persistability without reparsing the fileId. Callers that only want
// the data unwrap as needed (see useDocuments / useFetchDocument below).
export type DocumentSource = 'virtual' | 'static' | 'drive';

export interface DocumentEnvelope<T> {
  data: T;
  md5: string;
  source: DocumentSource;
}

async function loadDocument<T>(category: Category, id: string): Promise<DocumentEnvelope<T>> {
  const virtualResult = loadVirtualDocument(category, id);
  if (virtualResult) return virtualResult as Promise<DocumentEnvelope<T>>;
  const staticResult = loadStaticDocument(category, id);
  if (staticResult) return staticResult as Promise<DocumentEnvelope<T>>;
  const drive = await loadDriveDocument<T>(id);
  return { ...drive, source: 'drive' };
}

export function useDocument<T = unknown>(category: Category, id: string | undefined, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery<DocumentEnvelope<T>>({
    queryKey: [category, 'document', id],
    queryFn: () => loadDocument<T>(category, id!),
    enabled: enabled && !!id,
    staleTime: 15 * 60 * 1000,
    // Virtual ids (demo docs) have no backing Drive file and are synthesized
    // on read. Evicting the cache entry on last unsubscribe gives each new
    // mount a fresh createDefault, matching the pre-refactor "reset on
    // navigate" behavior. Real docs use the default gcTime for cross-nav
    // caching.
    gcTime: id && isVirtualId(id) ? 0 : undefined,
  });
}

export function useDocuments<T = unknown>(category: Category, ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [category, 'document', id] as const,
      queryFn: () => loadDocument<T>(category, id),
      staleTime: 15 * 60 * 1000,
    })),
    // `combine` projects the observer results into a single value that
    // react-query memoizes via structural sharing — same contents means
    // same reference, so downstream memos/effects don't churn on observer
    // events that don't change the data. Callers of useDocuments don't
    // care about versions, so we unwrap to just the data here.
    combine: (results) => ({
      data: results.map((r) => r.data?.data),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}

export function useFetchDocument() {
  const queryClient = useQueryClient();
  return async <T = unknown>(category: Category, id: string): Promise<T> => {
    const envelope = await queryClient.fetchQuery<DocumentEnvelope<T>>({
      queryKey: [category, 'document', id],
      queryFn: () => loadDocument<T>(category, id),
      staleTime: 15 * 60 * 1000,
    });
    return envelope.data;
  };
}

// Shape of the args union matches the two concrete Drive operations, so
// TypeScript enforces expectedMd5 on updates at every call site.
type SaveArgs =
  | {
      mode: 'create';
      category: Category;
      name: string;
      data: unknown;
      extraIndexFields?: Record<string, unknown>;
    }
  | {
      mode: 'update';
      category: Category;
      name: string;
      data: unknown;
      fileId: string;
      expectedMd5: string;
      extraIndexFields?: Record<string, unknown>;
    };

export function useSaveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveArgs) => {
      // Pass the current cached index into the service so it can do the
      // md5-skip optimization (meta-only GET instead of full re-fetch
      // when nothing else has changed index.json since we last read it).
      // Signed-in because every Drive call requires an auth token.
      const cachedIndex = queryClient.getQueryData<CachedDriveIndex>(
        indexQueryKey(args.category, true),
      ) ?? null;
      return args.mode === 'create'
        ? createDocument({ ...args, cachedIndex })
        : updateDocument({ ...args, cachedIndex });
    },
    onSuccess: (result, args) => {
      // Patch the document cache: update md5 *without* touching data —
      // if the user typed something while this save was in flight, the
      // cache already has the newer value and we'd clobber it otherwise.
      // If the cache is empty (first save right after create), seed it
      // from the result.
      queryClient.setQueryData<DocumentEnvelope<unknown>>(
        [args.category, 'document', result.fileId],
        (prev) => prev ? { ...prev, md5: result.md5 } : { data: result.data, md5: result.md5, source: 'drive' },
      );
      // Apply the index update returned by the service so useIndex
      // observers see the new entry without a refetch.
      queryClient.setQueryData<CachedDriveIndex>(
        indexQueryKey(args.category, true),
        result.updatedIndex,
      );
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { category: Category; fileId: string }) => {
      const cachedIndex = queryClient.getQueryData<CachedDriveIndex>(
        indexQueryKey(args.category, true),
      ) ?? null;
      return removeDocument(args.category, args.fileId, cachedIndex);
    },
    onSuccess: (result, args) => {
      queryClient.removeQueries({ queryKey: [args.category, 'document', args.fileId] });
      queryClient.setQueryData<CachedDriveIndex>(
        indexQueryKey(args.category, true),
        result.updatedIndex,
      );
    },
  });
}
