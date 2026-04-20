import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDocumentSyncOptions<T> {
  loaded: T | undefined;
  currentLocal: T | null;
  initialize: (saved: T) => void;
  isEqualToLocal: (saved: T) => boolean;
  getUpdatedAt: (saved: T) => string | undefined;
  triggerSave: (data: T) => void;
  flush: () => Promise<void>;
}

interface ConflictState<T> {
  remote: T;
  localUpdatedAt: string | undefined;
  remoteUpdatedAt: string | undefined;
}

export interface DocumentSyncResult {
  initialized: boolean;
  conflict: { local: string | undefined; remote: string | undefined } | null;
  useRemote: () => void;
  dismissConflict: () => void;
  keepLocal: () => void;
  markSaved: (saved: unknown) => void;
}

// Watches a TanStack-Query-loaded document for remote updates arriving after the
// editor has been initialized. If the user has no pending edits, silently adopts
// the new remote. If they do, surfaces a conflict state for the UI to resolve.
export function useDocumentSync<T>({
  loaded,
  currentLocal,
  initialize,
  isEqualToLocal,
  getUpdatedAt,
  triggerSave,
  flush,
}: UseDocumentSyncOptions<T>): DocumentSyncResult {
  const baselineRef = useRef<T | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [conflict, setConflict] = useState<ConflictState<T> | null>(null);

  const initializeRef = useRef(initialize);
  initializeRef.current = initialize;
  const isEqualRef = useRef(isEqualToLocal);
  isEqualRef.current = isEqualToLocal;
  const getUpdatedAtRef = useRef(getUpdatedAt);
  getUpdatedAtRef.current = getUpdatedAt;
  const currentLocalRef = useRef(currentLocal);
  currentLocalRef.current = currentLocal;
  const triggerSaveRef = useRef(triggerSave);
  triggerSaveRef.current = triggerSave;
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    if (!loaded) return;

    if (baselineRef.current === null) {
      baselineRef.current = loaded;
      initializeRef.current(loaded);
      setInitialized(true);
      return;
    }

    if (loaded === baselineRef.current) return;

    // Round-trip of our own save: local state already matches the new remote.
    if (isEqualRef.current(loaded)) {
      baselineRef.current = loaded;
      return;
    }

    // No unsaved local edits — adopt the new remote silently.
    if (isEqualRef.current(baselineRef.current)) {
      baselineRef.current = loaded;
      initializeRef.current(loaded);
      return;
    }

    setConflict({
      remote: loaded,
      localUpdatedAt: getUpdatedAtRef.current(baselineRef.current) ?? undefined,
      remoteUpdatedAt: getUpdatedAtRef.current(loaded) ?? undefined,
    });
  }, [loaded]);

  const useRemote = useCallback(() => {
    setConflict((current) => {
      if (!current) return null;
      baselineRef.current = current.remote;
      initializeRef.current(current.remote);
      return null;
    });
  }, []);

  const dismissConflict = useCallback(() => setConflict(null), []);

  const keepLocal = useCallback(() => {
    const local = currentLocalRef.current;
    if (!local) return;
    setConflict(null);
    triggerSaveRef.current(local);
    void flushRef.current();
  }, []);

  const markSaved = useCallback((saved: unknown) => {
    baselineRef.current = saved as T;
  }, []);

  return {
    initialized,
    conflict: conflict
      ? { local: conflict.localUpdatedAt, remote: conflict.remoteUpdatedAt }
      : null,
    useRemote,
    dismissConflict,
    keepLocal,
    markSaved,
  };
}
