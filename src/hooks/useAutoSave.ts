import { useRef, useCallback } from 'react';
import { useStorage, type Category } from '@/contexts/StorageContext';
import { useAuth } from '@/contexts/AuthContext';

const DEBOUNCE_MS = 2000;

interface AutoSaveOptions {
  category: Category;
  name: string;
  fileId: string | null;
  extraIndexFields?: Record<string, unknown>;
}

interface AutoSaveResult {
  triggerSave: (data: unknown) => void;
  flush: () => Promise<void>;
}

export function useAutoSave(options: AutoSaveOptions): AutoSaveResult {
  const { save } = useStorage();
  const { isSignedIn } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<unknown>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const doSave = useCallback(
    async (data: unknown) => {
      if (!isSignedIn) return;
      const { category, name, fileId, extraIndexFields } = optionsRef.current;
      await save(category, name, data, extraIndexFields, fileId ?? undefined);
    },
    [isSignedIn, save],
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

  return { triggerSave, flush };
}
