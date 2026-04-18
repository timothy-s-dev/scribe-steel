import { useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveDocument } from '@/hooks/queries/useDocument';
import { DriveError } from '@/services/google-drive';
import { reportSessionExpired } from '@/services/session-expiry';
import type { Category } from '@/data/types';

const DEBOUNCE_MS = 2000;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  category: Category;
  name: string;
  fileId: string | null;
  extraIndexFields?: Record<string, unknown>;
  deriveIndexFields?: (data: unknown) => Record<string, unknown>;
  onSaved?: (result: { fileId: string; updatedAt: string; data: unknown }) => void;
}

interface AutoSaveResult {
  triggerSave: (data: unknown) => void;
  flush: () => Promise<void>;
  saveStatus: SaveStatus;
  error: string | null;
}

export function useAutoSave(options: AutoSaveOptions): AutoSaveResult {
  const { isSignedIn } = useAuth();
  const mutation = useSaveDocument();
  const { mutateAsync } = mutation;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<unknown>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const doSave = useCallback(
    async (data: unknown) => {
      if (!isSignedIn) return;
      const { category, name, fileId, extraIndexFields, deriveIndexFields, onSaved } = optionsRef.current;
      const derived = deriveIndexFields ? deriveIndexFields(data) : undefined;
      try {
        const result = await mutateAsync({
          category,
          name,
          data,
          extraIndexFields: { ...extraIndexFields, ...derived },
          existingFileId: fileId ?? undefined,
        });
        onSaved?.(result);
      } catch (err) {
        if (err instanceof DriveError && err.status === 401) {
          // Preserve this save for retry once the user re-authenticates, but
          // don't clobber newer user input that already landed in pendingRef.
          if (pendingRef.current === null) pendingRef.current = data;
          reportSessionExpired();
        }
        // Otherwise: leave React Query's mutation.error to drive saveStatus.
      }
    },
    [isSignedIn, mutateAsync],
  );

  const triggerSave = useCallback(
    (data: unknown) => {
      pendingRef.current = data;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current !== null) {
          doSave(pendingRef.current);
          pendingRef.current = null;
        }
      }, DEBOUNCE_MS);
    },
    [doSave],
  );

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (pendingRef.current !== null) {
      await doSave(pendingRef.current);
      pendingRef.current = null;
    }
  }, [doSave]);

  // After a 401-driven retry is queued, fire it as soon as auth comes back.
  useEffect(() => {
    if (!isSignedIn || pendingRef.current === null) return;
    const data = pendingRef.current;
    pendingRef.current = null;
    doSave(data);
  }, [isSignedIn, doSave]);

  const saveStatus: SaveStatus = mutation.isPending
    ? 'saving'
    : mutation.isError
      ? 'error'
      : mutation.isSuccess
        ? 'saved'
        : 'idle';

  const error = mutation.error ? (mutation.error as Error).message : null;

  return { triggerSave, flush, saveStatus, error };
}
