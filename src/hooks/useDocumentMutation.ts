import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveDocument, type DocumentEnvelope } from '@/hooks/queries/useDocument';
import { DriveError, DriveConflictError } from '@/services/google-drive';
import { invalidateToken } from '@/services/google-auth';
import { reportSessionExpired } from '@/services/session-expiry';
import type { Category } from '@/data/types';

const DEBOUNCE_MS = 2000;
// Exponential backoff for transient (non-401, non-conflict) save failures.
// Starts at 2s and doubles up to a 60s ceiling — kept indefinite so a
// user's edits never silently sit unsaved when Drive is flaky.
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 60_000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'retrying' | 'error';

export interface ConflictState {
  remoteData: unknown;
  remoteMd5: string;
  remoteModifiedTime: string;
}

export interface RetryState {
  // 1-based count of failed attempts so far. The pending retry is attempt
  // `attempt + 1`.
  attempt: number;
  // Wall-clock ms (Date.now()) when the timer fires.
  nextRetryAt: number;
  lastError: string;
}

function nextDelay(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS);
}

function canonicalize(data: unknown): string {
  return JSON.stringify(data);
}

interface UseDocumentMutationOptions<T> {
  category: Category;
  // Identifier used for both the cache key and (for real documents) the
  // Drive fileId. Non-Drive envelopes (virtual demo, static bestiary
  // entries) flow through the same paths but skip the network save —
  // see the `envelope.source !== 'drive'` gates below.
  fileId: string;
  deriveIndexFields?: (data: T) => Record<string, unknown>;
}

export interface UseDocumentMutationResult<T> {
  // Writes `next` to the cache synchronously, then schedules a debounced
  // save. All subscribers of the cache key re-render immediately; Drive
  // sees only the final value after the debounce window.
  edit: (next: T) => void;
  saveStatus: SaveStatus;
  error: string | null;
  conflict: ConflictState | null;
  // Populated when the most recent save failed transiently and a retry is
  // armed via setTimeout. Cleared on success, on a fresh user edit, or on
  // an unrecoverable terminal state (conflict / 401).
  retry: RetryState | null;
  // Wall-clock ms (Date.now()) of the most recent successful save in this
  // session, or null if no save has succeeded yet. Used by the status badge
  // to surface a "saved N min ago" hover.
  lastSavedAt: number | null;
  // Discard local edits: invalidate the cache so the next read pulls
  // authoritative state from Drive. Resolves the conflict state.
  resolveUseRemote: () => void;
  // Keep local edits: bump the cached md5 to the remote's so the next
  // save sees itself as up-to-date, then re-fire the save. Resolves the
  // conflict state.
  resolveKeepLocal: () => void;
}

// Cache-first autosave. The TanStack Query cache is the single source of
// truth for the document's in-flight state; the form reads it, the preview
// reads it, and `edit` updates it optimistically before the debounced save
// ever talks to Drive.
export function useDocumentMutation<T extends { name: string }>({
  category,
  fileId,
  deriveIndexFields,
}: UseDocumentMutationOptions<T>): UseDocumentMutationResult<T> {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useSaveDocument();
  const { mutateAsync } = mutation;
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [retry, setRetry] = useState<RetryState | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<T | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // True while a save's network call is in flight. Guards against firing
  // a second save on top of the first — concurrent saves would both read
  // the same pre-save md5 from the cache, and whichever hits Drive second
  // would see a mismatch and raise DriveConflictError. A save attempt
  // that arrives while this is true gets queued into pendingRef and
  // drained when the current save succeeds.
  const saveInFlightRef = useRef(false);
  // Set by the 401 catch so the auth-recovery effect knows to retry once
  // sign-in returns. Cleared when the effect consumes it. Distinct from
  // `mutation.isError` (which lights up for any failure) so that conflicts
  // and 5xxs don't trip the auth-recovery path.
  const authRetryPendingRef = useRef(false);
  // Canonical form of the data we last successfully persisted (or the
  // server-authoritative data the cache was populated with). We can't
  // compare against the cache's data to detect no-ops because `edit`
  // optimistically updates the cache *before* scheduling the save — by
  // the time runSave fires, the cache already matches the outgoing data.
  const lastSyncedCanonicalRef = useRef<string | null>(null);

  const cancelRetry = useCallback(() => {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = undefined;
    setRetry(null);
  }, []);

  // runSave is recursive via the backoff timer. Hold the latest version
  // in a ref so the timer always invokes the current closure (avoids
  // stale dep captures across re-renders).
  const runSaveRef = useRef<(data: T) => Promise<void>>(undefined);

  const runSave = useCallback(
    async (data: T) => {
      if (!isSignedIn) return;

      const cached = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
      if (!cached) {
        // edit() only fires after a read has populated the cache, so this
        // branch should be unreachable — fail loud if the invariant breaks.
        throw new Error('useDocumentMutation: no cached document for fileId');
      }
      // Non-persistent envelopes (virtual demo, static bestiary entries)
      // live entirely in the cache and have no Drive-backed file.
      if (cached.source !== 'drive') return;

      // Serialize: if another save is mid-flight, queue this attempt so it
      // fires once the current one resolves. Without this, two saves would
      // both read the pre-save md5 from the cache and the second one would
      // hit DriveConflictError when Drive's md5 has already moved on.
      if (saveInFlightRef.current) {
        pendingRef.current = data;
        return;
      }
      // Skip no-op saves: outgoing data matches what we last synced with
      // the server. Catches reverts and Strict-Mode double invocations.
      const canonical = canonicalize(data);
      if (canonical === lastSyncedCanonicalRef.current) return;

      const derived = deriveIndexFields ? deriveIndexFields(data) : undefined;
      saveInFlightRef.current = true;
      let succeeded = false;
      try {
        await mutateAsync({
          mode: 'update',
          category,
          name: data.name,
          data,
          fileId,
          expectedMd5: cached.md5,
          extraIndexFields: derived,
        });
        lastSyncedCanonicalRef.current = canonical;
        cancelRetry();
        setLastSavedAt(Date.now());
        succeeded = true;
      } catch (err) {
        if (err instanceof DriveConflictError) {
          setConflict({
            remoteData: err.remoteData,
            remoteMd5: err.remoteMd5,
            remoteModifiedTime: err.remoteModifiedTime,
          });
          // Conflict has its own resolution UI; don't keep retrying.
          cancelRetry();
        } else if (err instanceof DriveError && err.status === 401) {
          // Sign-out flips isSignedIn false; re-auth flips it true and the
          // auth-recovery effect re-fires the save with the latest cached
          // data. Backoff retry isn't appropriate here — the user has to
          // act, and SessionExpiryDialog handles that.
          authRetryPendingRef.current = true;
          cancelRetry();
          reportSessionExpired();
          invalidateToken();
        } else {
          // Generic transient error — schedule the next attempt with
          // exponential backoff. Use the state setter to avoid stale reads
          // of the previous attempt count.
          const message = err instanceof Error ? err.message : String(err);
          setRetry((prev) => {
            const attempt = (prev?.attempt ?? 0) + 1;
            const delay = nextDelay(attempt);
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              // Pull fresh data from the cache so any edits the user made
              // during the wait window are honored.
              const latest = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
              if (latest) void runSaveRef.current?.(latest.data);
            }, delay);
            return {
              attempt,
              nextRetryAt: Date.now() + delay,
              lastError: message,
            };
          });
        }
      } finally {
        saveInFlightRef.current = false;
      }

      // Drain a save that was queued during the in-flight window. Only on
      // success — conflict/401/transient-retry each have their own follow-up
      // path that reads from the cache (which already has the latest edits).
      if (succeeded) {
        const queued = pendingRef.current;
        if (queued !== null) {
          pendingRef.current = null;
          clearTimeout(timerRef.current);
          void runSaveRef.current?.(queued);
        }
      }
    },
    [fileId, isSignedIn, queryClient, category, deriveIndexFields, mutateAsync, cancelRetry],
  );

  useEffect(() => {
    runSaveRef.current = runSave;
  });

  const scheduleSave = useCallback(
    (data: T) => {
      pendingRef.current = data;
      clearTimeout(timerRef.current);
      // A fresh user edit takes priority over any pending backoff retry —
      // cancel the retry so we don't end up with two concurrent saves
      // racing each other.
      cancelRetry();
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (pending === null) return;
        pendingRef.current = null;
        void runSave(pending);
      }, DEBOUNCE_MS);
    },
    [runSave, cancelRetry],
  );

  const edit = useCallback(
    (next: T) => {
      const current = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
      // Seed the "last synced" marker on first edit from the pre-edit
      // cache, which still reflects server-authoritative state at this
      // point. After the optimistic setQueryData below, that information
      // is no longer recoverable from the cache alone.
      if (lastSyncedCanonicalRef.current === null && current) {
        lastSyncedCanonicalRef.current = canonicalize(current.data);
      }
      queryClient.setQueryData<DocumentEnvelope<T>>([category, 'document', fileId], (prev) =>
        prev ? { ...prev, data: next } : prev,
      );
      // Non-persistent envelopes live entirely in the cache — no network
      // save to schedule.
      if (current?.source !== 'drive' || conflict) return;
      scheduleSave(next);
    },
    [queryClient, category, fileId, conflict, scheduleSave],
  );

  // Resume the save after the user signs back in following a 401. Pulls
  // the latest data from the cache so any edits the user made while
  // signed out (which still optimistically updated the cache) are
  // included in the retry. Wrapped in useEffectEvent so the runSave
  // identity doesn't drag the effect into refire loops on every render.
  const performAuthRetry = useEffectEvent(() => {
    if (!authRetryPendingRef.current) return;
    authRetryPendingRef.current = false;
    const cached = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
    if (cached) void runSave(cached.data);
  });
  useEffect(() => {
    if (isSignedIn) performAuthRetry();
  }, [isSignedIn]);

  // Flush pending save on unmount so edits aren't lost on navigation.
  // Cancel any backoff retry too — we'll fire one final attempt with the
  // pending data instead of waiting for the timer.
  const finalFlush = useEffectEvent(() => {
    clearTimeout(timerRef.current);
    clearTimeout(retryTimerRef.current);
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;
    void runSave(pending);
  });
  useEffect(() => () => finalFlush(), []);

  const resolveUseRemote = useCallback(() => {
    // Refetch authoritative state. The query re-runs, the cache updates,
    // and every subscriber (form, preview) re-renders with remote data.
    void queryClient.invalidateQueries({ queryKey: [category, 'document', fileId] });
    // Force reseed on the next edit — the cache's next value will be
    // server-authoritative again.
    lastSyncedCanonicalRef.current = null;
    setConflict(null);
  }, [queryClient, category, fileId]);

  const resolveKeepLocal = useCallback(() => {
    if (!conflict) return;
    const { remoteMd5 } = conflict;
    // Bump the cached md5 to match the server's so the next save's
    // expectedMd5 is current. The cached `data` is already the local
    // edits (we never overwrote it on conflict).
    queryClient.setQueryData<DocumentEnvelope<T>>([category, 'document', fileId], (prev) =>
      prev ? { ...prev, md5: remoteMd5 } : prev,
    );
    setConflict(null);
    const cached = queryClient.getQueryData<DocumentEnvelope<T>>([category, 'document', fileId]);
    if (cached) scheduleSave(cached.data);
  }, [conflict, queryClient, category, fileId, scheduleSave]);

  const saveStatus: SaveStatus = mutation.isPending
    ? 'saving'
    : retry
      ? 'retrying'
      : conflict
        ? 'error'
        : mutation.isError
          ? 'error'
          : mutation.isSuccess
            ? 'saved'
            : 'idle';

  const error = retry
    ? retry.lastError
    : mutation.error
      ? (mutation.error as Error).message
      : null;

  return { edit, saveStatus, error, conflict, retry, lastSavedAt, resolveUseRemote, resolveKeepLocal };
}
