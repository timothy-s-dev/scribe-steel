import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  saveDocument,
  loadDocument,
  removeDocument,
  loadIndex,
  getCachedIndex,
  type Category,
  type IndexFile,
  type IndexItem,
} from '@/services/storage';
import { useAuth } from './AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface StorageState {
  /** Current save operation status */
  saveStatus: SaveStatus;
  /** Error message from the last failed operation */
  lastError: string | null;
  /** Clear the error state */
  clearError: () => void;

  /** Save a document to Drive. Returns the file ID. */
  save: (
    category: Category,
    name: string,
    data: unknown,
    extraIndexFields?: Record<string, unknown>,
    existingFileId?: string,
  ) => Promise<string | null>;

  /** Load a document from Drive by file ID. */
  load: <T = unknown>(fileId: string) => Promise<T | null>;

  /** Delete a document from Drive. */
  remove: (category: Category, fileId: string) => Promise<boolean>;

  /** Fetch the index for a category from Drive (updates cache). */
  fetchIndex: (category: Category) => Promise<IndexFile | null>;

  /** Get the cached index for a category (instant, may be stale). */
  cachedIndex: (category: Category) => IndexFile | null;
}

// ── Context ──────────────────────────────────────────────────────────────────

const StorageContext = createContext<StorageState | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setLastError(null);
    setSaveStatus('idle');
  }, []);

  const save = useCallback(
    async (
      category: Category,
      name: string,
      data: unknown,
      extraIndexFields?: Record<string, unknown>,
      existingFileId?: string,
    ): Promise<string | null> => {
      if (!isSignedIn) return null;
      setSaveStatus('saving');
      setLastError(null);
      try {
        const fileId = await saveDocument(category, name, data, extraIndexFields, existingFileId);
        setSaveStatus('saved');
        // Reset to idle after a moment
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
        return fileId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Save failed';
        setLastError(msg);
        setSaveStatus('error');
        return null;
      }
    },
    [isSignedIn],
  );

  const load = useCallback(
    async <T = unknown>(fileId: string): Promise<T | null> => {
      if (!isSignedIn) return null;
      try {
        return await loadDocument<T>(fileId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Load failed';
        setLastError(msg);
        return null;
      }
    },
    [isSignedIn],
  );

  const remove = useCallback(
    async (category: Category, fileId: string): Promise<boolean> => {
      if (!isSignedIn) return false;
      try {
        await removeDocument(category, fileId);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Delete failed';
        setLastError(msg);
        return false;
      }
    },
    [isSignedIn],
  );

  const fetchIndex = useCallback(
    async (category: Category): Promise<IndexFile | null> => {
      if (!isSignedIn) return null;
      try {
        return await loadIndex(category);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load index';
        setLastError(msg);
        return null;
      }
    },
    [isSignedIn],
  );

  const cachedIndex = useCallback(
    (category: Category): IndexFile | null => {
      return getCachedIndex(category);
    },
    [],
  );

  return (
    <StorageContext.Provider
      value={{ saveStatus, lastError, clearError, save, load, remove, fetchIndex, cachedIndex }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageState {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within a StorageProvider');
  return ctx;
}

export type { IndexFile, IndexItem, Category };
