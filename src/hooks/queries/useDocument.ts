import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadDocument as loadDriveDocument, saveDocument, removeDocument } from '@/services/google-drive';
import { loadStaticDocument } from './staticData';
import type { Category } from '@/data/types';

async function loadDocument<T>(category: Category, id: string): Promise<T> {
  const staticResult = loadStaticDocument(category, id);
  if (staticResult) return staticResult as Promise<T>;
  return loadDriveDocument<T>(id);
}

export function useDocument<T = unknown>(category: Category, id: string | undefined, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery<T>({
    queryKey: [category, 'document', id],
    queryFn: () => loadDocument<T>(category, id!),
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
}

export function useDocuments<T = unknown>(category: Category, ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [category, 'document', id] as const,
      queryFn: () => loadDocument<T>(category, id),
      staleTime: 30 * 1000,
    })),
  });
}

export function useFetchDocument() {
  const queryClient = useQueryClient();
  return <T = unknown>(category: Category, id: string) =>
    queryClient.fetchQuery<T>({
      queryKey: [category, 'document', id],
      queryFn: () => loadDocument<T>(category, id),
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
    onSuccess: (_fileId, args) => {
      queryClient.invalidateQueries({ queryKey: [args.category, 'index'] });
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
