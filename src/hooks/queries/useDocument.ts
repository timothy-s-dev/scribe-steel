import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadDocument as loadDriveDocument,
  createDocument,
  updateDocument,
  removeDocument,
} from '@/services/google-drive';
import { isVirtualId, loadStaticDocument, loadVirtualDocument } from './staticData';
import type { Category, IndexFile, IndexItem } from '@/data/types';

// The cache stores { data, version } for every document query. Version is
// used for optimistic concurrency on save; callers that only want the data
// unwrap as needed (see useDocuments / useFetchDocument below).
export interface DocumentEnvelope<T> {
  data: T;
  version: number;
}

async function loadDocument<T>(category: Category, id: string): Promise<DocumentEnvelope<T>> {
  const virtualResult = loadVirtualDocument(category, id);
  if (virtualResult) return virtualResult as Promise<DocumentEnvelope<T>>;
  const staticResult = loadStaticDocument(category, id);
  if (staticResult) return staticResult as Promise<DocumentEnvelope<T>>;
  return loadDriveDocument<T>(id);
}

export function useDocument<T = unknown>(category: Category, id: string | undefined, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery<DocumentEnvelope<T>>({
    queryKey: [category, 'document', id],
    queryFn: () => loadDocument<T>(category, id!),
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
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
      staleTime: 30 * 1000,
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
      staleTime: 30 * 1000,
    });
    return envelope.data;
  };
}

// Shape of the args union matches the two concrete Drive operations, so
// TypeScript enforces expectedVersion on updates at every call site.
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
      expectedVersion: number;
      extraIndexFields?: Record<string, unknown>;
    };

export function useSaveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: SaveArgs) =>
      args.mode === 'create'
        ? createDocument(args)
        : updateDocument(args),
    onSuccess: (result, args) => {
      // Patch the index cache in place instead of invalidating — we have
      // the authoritative entry in hand, and the server-side write in
      // updateDocument has already persisted it. Refetching would mean two
      // extra Drive calls (findFile + readFile) per save.
      const entry: IndexItem = {
        fileId: result.fileId,
        name: args.name,
        updatedAt: result.updatedAt,
        ...(args.extraIndexFields ?? {}),
        // useIndex tags Drive-backed items; preserve that shape so the UI
        // doesn't treat a freshly-saved entry as static.
        custom: true,
      };
      queryClient.setQueriesData<IndexFile>({ queryKey: [args.category, 'index'] }, (prev) => {
        if (!prev) return prev;
        const idx = prev.items.findIndex((i) => i.fileId === result.fileId);
        const items = idx >= 0
          ? prev.items.map((i, j) => (j === idx ? entry : i))
          : [...prev.items, entry];
        return { ...prev, items };
      });
      queryClient.setQueryData([args.category, 'document', result.fileId], {
        data: result.data,
        version: result.version,
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { category: Category; fileId: string }) =>
      removeDocument(args.category, args.fileId),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: [args.category, 'index'] });
      queryClient.removeQueries({ queryKey: [args.category, 'document', args.fileId] });
    },
  });
}
