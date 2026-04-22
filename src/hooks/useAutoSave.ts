import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveDocument } from '@/hooks/queries/useDocument';
import { DriveError, DriveConflictError } from '@/services/google-drive';
import { invalidateToken } from '@/services/google-auth';
import { reportSessionExpired } from '@/services/session-expiry';
import type { Category } from '@/data/types';

const DEBOUNCE_MS = 2000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveResult {
  fileId: string;
  version: number;
  updatedAt: string;
  data: unknown;
}

export interface ConflictState {
  remoteData: unknown;
  remoteVersion: number;
  remoteUpdatedAt: string | undefined;
  localUpdatedAt: string | undefined;
}

// Shape of the document cache entry — duplicated here to avoid circular
// imports. Kept in sync with DocumentEnvelope<T> in useDocument.ts.
interface CachedDocument<T> {
  data: T;
  version: number;
}

// `updatedAt` is stamped by the save pipeline at write time; it always
// differs between the local working copy and the cached document, so it's
// excluded when comparing for no-op-ness.
const META_KEYS = new Set(['updatedAt']);

function canonicalize(data: unknown): string {
  return JSON.stringify(data, (key, value) => (META_KEYS.has(key) ? undefined : value));
}

// `deriveIndexFields` and `getUpdatedAt` go directly into runSave's deps,
// so callers MUST pass stable references (wrap with useCallback) or every
// parent render will rebuild triggerSave.
interface AutoSaveOptions<T> {
  category: Category;
  name: string;
  // null when we're still in create-mode (no fileId assigned yet).
  fileId: string | null;
  extraIndexFields?: Record<string, unknown>;
  deriveIndexFields?: (data: T) => Record<string, unknown>;
  // Pure extractor so we can stamp dialog timestamps without callbacks.
  getUpdatedAt: (data: T) => string | undefined;
}

export interface AutoSaveResult<T> {
  // Schedules a debounced save. Repeated calls reset the timer — the hook
  // always saves the most recent data passed before the debounce expires.
  triggerSave: (data: T) => void;
  saveStatus: SaveStatus;
  error: string | null;
  // Populated when the latest save attempt hit a version mismatch. Callers
  // decide how to resolve (update the cache version and retrigger a save,
  // or adopt the remote into local state). Clear with `clearConflict`.
  conflict: ConflictState | null;
  clearConflict: () => void;
  lastSaved: SaveResult | null;
}

export function useAutoSave<T>({
  category,
  name,
  fileId,
  extraIndexFields,
  deriveIndexFields,
  getUpdatedAt,
}: AutoSaveOptions<T>): AutoSaveResult<T> {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useSaveDocument();
  const { mutateAsync } = mutation;
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<T | null>(null);

  // Core save routine. Reads expectedVersion from the query cache — which
  // useSaveDocument.onSuccess keeps current via setQueryData — so callers
  // don't have to thread version state back and forth.
  const runSave = useCallback(
    async (data: T) => {
      if (!isSignedIn) return;
      const derived = deriveIndexFields ? deriveIndexFields(data) : undefined;
      const extra = { ...extraIndexFields, ...derived };

      try {
        if (fileId === null) {
          await mutateAsync({
            mode: 'create',
            category,
            name,
            data,
            extraIndexFields: extra,
          });
        } else {
          const cached = queryClient.getQueryData<CachedDocument<T>>([
            category,
            'document',
            fileId,
          ]);
          if (!cached) {
            // The doc must have loaded at least once before a save can
            // fire — the form isn't rendered without it. Fail loudly
            // rather than silently last-write-wins.
            throw new Error('useAutoSave: no cached document for fileId');
          }
          // Skip no-op saves: if the outgoing data is content-equal to
          // what the cache already holds, there's nothing to write. This
          // covers redundant emissions (e.g. Strict Mode double-invoking
          // form mount effects in development, or a user reverting back
          // to the saved state) without a round-trip to Drive.
          if (canonicalize(data) === canonicalize(cached.data)) {
            return;
          }
          await mutateAsync({
            mode: 'update',
            category,
            name,
            data,
            fileId,
            expectedVersion: cached.version,
            extraIndexFields: extra,
          });
        }
      } catch (err) {
        if (err instanceof DriveConflictError) {
          setConflict({
            remoteData: err.remoteData,
            remoteVersion: err.remoteVersion,
            remoteUpdatedAt: readUpdatedAt(err.remoteData, getUpdatedAt),
            localUpdatedAt: getUpdatedAt(data),
          });
          return;
        }
        if (err instanceof DriveError && err.status === 401) {
          // Preserve this save for retry once the user re-authenticates,
          // but don't clobber newer user input that already landed in
          // pendingRef.
          if (pendingRef.current === null) pendingRef.current = data;
          reportSessionExpired();
          // Clear our local token since Drive rejected it server-side.
          // This transitions isSignedIn true→false, and the subsequent
          // sign-in flips it false→true, which triggers the retry effect.
          invalidateToken();
          return;
        }
        // Otherwise: leave react-query's mutation.error to drive saveStatus.
      }
    },
    [
      isSignedIn,
      mutateAsync,
      queryClient,
      category,
      name,
      fileId,
      extraIndexFields,
      deriveIndexFields,
      getUpdatedAt,
    ],
  );

  const triggerSave = useCallback(
    (data: T) => {
      // While a conflict is unresolved, don't queue more saves on top of
      // it — they'd all fight with stale versions.
      if (conflict) return;
      pendingRef.current = data;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending === null) return;
        pendingRef.current = null;
        runSave(pending);
      }, DEBOUNCE_MS);
    },
    [conflict, runSave],
  );

  // After a 401-driven retry is queued, fire it as soon as auth comes back.
  useEffect(() => {
    if (!isSignedIn || pendingRef.current === null) return;
    const data = pendingRef.current;
    pendingRef.current = null;
    runSave(data);
  }, [isSignedIn, runSave]);

  // Flush any pending save on unmount so edits aren't lost when the user
  // navigates away within the debounce window.
  const finalFlush = useEffectEvent(() => {
    clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    void runSave(pending);
  });
  useEffect(() => {
    return () => finalFlush();
  }, []);

  const clearConflict = useCallback(() => setConflict(null), []);

  const saveStatus: SaveStatus = mutation.isPending
    ? 'saving'
    : conflict
      ? 'error'
      : mutation.isError
        ? 'error'
        : mutation.isSuccess
          ? 'saved'
          : 'idle';

  const error = mutation.error ? (mutation.error as Error).message : null;
  const lastSaved = (mutation.data as SaveResult | undefined) ?? null;

  return {
    triggerSave,
    saveStatus,
    error,
    conflict,
    clearConflict,
    lastSaved,
  };
}

function readUpdatedAt<T>(
  data: unknown,
  getUpdatedAt: (d: T) => string | undefined,
): string | undefined {
  try {
    return getUpdatedAt(data as T);
  } catch {
    return undefined;
  }
}
