import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveDocument, type DocumentEnvelope } from '@/hooks/queries/useDocument';
import { invalidateToken } from '@/services/google-auth';
import { reportSessionExpired } from '@/services/session-expiry';
import {
  AutosaveController,
  type AutosaveConflict,
  type AutosaveRetry,
  type AutosaveStatus,
} from '@/lib/autosaveController';
import type { Category } from '@/data/types';

export type SaveStatus = AutosaveStatus;
export type ConflictState = AutosaveConflict;
export type RetryState = AutosaveRetry;

interface UseDocumentMutationOptions<T> {
  category: Category;
  // Identifier used for both the cache key and (for real documents) the
  // Drive fileId. Non-Drive envelopes (virtual demo, static bestiary
  // entries) flow through the same paths but skip the network save —
  // see the `envelope.source !== 'drive'` gate in `edit` below.
  fileId: string;
  deriveIndexFields?: (data: T) => Record<string, unknown>;
}

export interface UseDocumentMutationResult<T> {
  edit: (next: T) => void;
  saveStatus: SaveStatus;
  error: string | null;
  conflict: ConflictState | null;
  retry: RetryState | null;
  lastSavedAt: number | null;
  resolveUseRemote: () => void;
  resolveKeepLocal: () => void;
}

// Cache-first autosave. The TanStack Query cache is the single source of
// truth for the document's in-flight state; the form reads it, the preview
// reads it, and `edit` updates it optimistically before the debounced save
// ever talks to Drive. The AutosaveController (plain TS, React-free) owns
// the scheduling / serialization / retry state machine; this hook is just
// the glue that wires it into React state and the TanStack cache.
export function useDocumentMutation<T extends { name: string }>({
  category,
  fileId,
  deriveIndexFields,
}: UseDocumentMutationOptions<T>): UseDocumentMutationResult<T> {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const { mutateAsync } = useSaveDocument();

  const [controller] = useState(() => new AutosaveController<T>());

  // The controller is constructed once, but its callbacks need to close
  // over the current render's props so each invocation sees the latest
  // category / fileId / deriveIndexFields. Reinstalling callbacks every
  // commit keeps the controller wired to the newest closure without
  // rebuilding its timer state.
  useEffect(() => {
    controller.setCallbacks({
      save: async (data) => {
        const envelope = queryClient.getQueryData<DocumentEnvelope<T>>(
          [category, 'document', fileId],
        );
        if (!envelope) {
          // Controller only saves after an edit() has run, which requires
          // a populated cache. Fail loud if the invariant breaks.
          throw new Error('useDocumentMutation: no cached document for fileId');
        }
        const derived = deriveIndexFields?.(data);
        await mutateAsync({
          mode: 'update',
          category,
          name: data.name,
          data,
          fileId,
          expectedMd5: envelope.md5,
          extraIndexFields: derived,
        });
      },
      getLatestData: () => {
        const envelope = queryClient.getQueryData<DocumentEnvelope<T>>(
          [category, 'document', fileId],
        );
        return envelope?.data ?? null;
      },
      onAuthExpired: () => {
        invalidateToken();
        reportSessionExpired();
      },
    });
  });

  const subscribe = useCallback(
    (cb: () => void) => controller.subscribe(cb),
    [controller],
  );
  const getSnapshot = useCallback(() => controller.snapshot(), [controller]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const edit = useCallback(
    (next: T) => {
      const current = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
      // Seed the controller's "last synced" marker from the pre-edit cache
      // — after the optimistic setQueryData below, that information is no
      // longer recoverable from the cache alone.
      if (current) controller.primeSyncedSnapshot(current.data);
      queryClient.setQueryData<DocumentEnvelope<T>>([category, 'document', fileId], (prev) =>
        prev ? { ...prev, data: next } : prev,
      );
      // Non-persistent envelopes live entirely in the cache — no network
      // save to schedule.
      if (current?.source !== 'drive') return;
      controller.schedule(next);
    },
    [queryClient, category, fileId, controller],
  );

  const resolveUseRemote = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [category, 'document', fileId] });
    controller.resolveUseRemote();
  }, [queryClient, category, fileId, controller]);

  const resolveKeepLocal = useCallback(() => {
    const conflict = controller.snapshot().conflict;
    if (!conflict) return;
    // Bump the cached md5 to match the server's so the next save's
    // expectedMd5 is current. The cached `data` is already the local
    // edits (we never overwrote it on conflict).
    queryClient.setQueryData<DocumentEnvelope<T>>([category, 'document', fileId], (prev) =>
      prev ? { ...prev, md5: conflict.remoteMd5 } : prev,
    );
    controller.resolveKeepLocal();
  }, [queryClient, category, fileId, controller]);

  // Resume a 401-parked save once the user signs back in. Pulls fresh
  // data from the cache so edits made while signed out (which still
  // optimistically updated the cache) are included in the retry.
  useEffect(() => {
    if (isSignedIn) controller.notifyAuthResumed();
  }, [isSignedIn, controller]);

  // Flush pending save on unmount so edits aren't lost on navigation.
  useEffect(() => () => controller.flush(), [controller]);

  return {
    edit,
    saveStatus: state.status,
    error: state.error,
    conflict: state.conflict,
    retry: state.retry,
    lastSavedAt: state.lastSavedAt,
    resolveUseRemote,
    resolveKeepLocal,
  };
}
