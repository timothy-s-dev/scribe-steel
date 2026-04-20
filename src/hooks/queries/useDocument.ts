import { useQuery, useQueries, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { loadDocument as loadDriveDocument, saveDocument, removeDocument } from '@/services/google-drive';
import { loadStaticDocument } from './staticData';
import type { Category, IndexFile } from '@/data/types';

async function loadDocument<T>(category: Category, id: string): Promise<T> {
  const staticResult = loadStaticDocument(category, id);
  if (staticResult) return staticResult as Promise<T>;
  return loadDriveDocument<T>(id);
}

// Ensures loaded docs have a canonical `name` field even if they were saved
// before the schema rename. Falls back in order: existing name, legacy
// `encounter` field, the index entry's name. Missing name becomes ''.
function backfillName<T>(data: T, queryClient: QueryClient, category: Category, id: string): T {
  if (!data || typeof data !== 'object') return data;
  const obj = data as Record<string, unknown>;
  if (typeof obj.name === 'string' && obj.name.length > 0) return data;
  const legacy = obj.encounter;
  if (typeof legacy === 'string' && legacy.length > 0) {
    return { ...obj, name: legacy } as T;
  }
  const index = queryClient.getQueryData<IndexFile>([category, 'index']);
  const item = index?.items.find((i) => i.fileId === id);
  return { ...obj, name: item?.name ?? '' } as T;
}

export function useDocument<T = unknown>(category: Category, id: string | undefined, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  return useQuery<T>({
    queryKey: [category, 'document', id],
    queryFn: async () => {
      const data = await loadDocument<T>(category, id!);
      return backfillName(data, queryClient, category, id!);
    },
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
}

export function useDocuments<T = unknown>(category: Category, ids: string[]) {
  const queryClient = useQueryClient();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [category, 'document', id] as const,
      queryFn: async () => {
        const data = await loadDocument<T>(category, id);
        return backfillName(data, queryClient, category, id);
      },
      staleTime: 30 * 1000,
    })),
  });
}

export function useFetchDocument() {
  const queryClient = useQueryClient();
  return <T = unknown>(category: Category, id: string) =>
    queryClient.fetchQuery<T>({
      queryKey: [category, 'document', id],
      queryFn: async () => {
        const data = await loadDocument<T>(category, id);
        return backfillName(data, queryClient, category, id);
      },
      staleTime: 30 * 1000,
    });
}

export function useSaveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      category: Category;
      name: string;
      data: unknown;
      extraIndexFields?: Record<string, unknown>;
      existingFileId?: string;
    }) =>
      saveDocument(
        args.category,
        args.name,
        args.data,
        args.extraIndexFields,
        args.existingFileId,
      ),
    onSuccess: (result, args) => {
      queryClient.invalidateQueries({ queryKey: [args.category, 'index'] });
      queryClient.setQueryData([args.category, 'document', result.fileId], result.data);
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
