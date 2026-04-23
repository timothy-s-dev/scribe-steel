// Mock replacement for google-drive.ts. Swapped in via Vite `resolve.alias`
// when VITE_USE_MOCK_DRIVE is set. All state lives in localStorage keyed by
// STORAGE_KEY; sign-out does not clear it, matching prod behavior where your
// Drive data survives re-login.

import { getAccessToken } from './google-auth.mock';
import { queryClient } from '@/lib/queryClient';
import type { Category, IndexFile, IndexItem } from '@/data/types';

export interface CachedDriveIndex {
  items: IndexItem[];
  fileId: string | null;
  md5: string | null;
}

export const indexQueryKey = (category: Category, isSignedIn: boolean) =>
  [category, 'index', isSignedIn] as const;

// Mirror the real service's cache-update behavior so useIndex observers
// re-render after a mutation without needing a refetch. The mock has no
// real md5; we synthesize new ones so any cache identity checks behave
// the same way (new write → new md5).
function syncIndexCache(category: Category, index: IndexFile): void {
  queryClient.setQueryData<CachedDriveIndex>(indexQueryKey(category, true), {
    items: index.items,
    fileId: `mock-index-${category}`,
    md5: newId(),
  });
}

class DriveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

// Mirrors the real DriveConflictError so callers can branch on instanceof
// uniformly across mock and prod.
class DriveConflictError extends Error {
  remoteData: unknown;
  remoteMd5: string;
  remoteModifiedTime: string;
  constructor(remoteData: unknown, remoteMd5: string, remoteModifiedTime: string) {
    super('Remote content has changed since load');
    this.name = 'DriveConflictError';
    this.remoteData = remoteData;
    this.remoteMd5 = remoteMd5;
    this.remoteModifiedTime = remoteModifiedTime;
  }
}

const STORAGE_KEY = 'scribe-steel-mock-drive-state';
const LATENCY_MS = 40;

// Test-only escape hatch: set localStorage["scribe-steel-mock-fail-next"] to
// e.g. "save:500" or "load:404" to make the next matching op reject with that
// DriveError status. The flag is consumed on use — one failure per set.
//
// Suffix the value with "xN" (e.g. "save:500x3") to fail the next N matching
// ops instead of just one — useful for exercising backoff sequences.
const FAIL_NEXT_KEY = 'scribe-steel-mock-fail-next';

function maybeInjectFailure(op: 'save' | 'load' | 'list'): void {
  const raw = localStorage.getItem(FAIL_NEXT_KEY);
  if (!raw) return;
  const [failOp, statusAndCount] = raw.split(':');
  if (failOp !== op) return;
  const [statusStr, countStr] = statusAndCount.split('x');
  const remaining = countStr ? Math.max(0, Number.parseInt(countStr, 10) - 1) : 0;
  if (remaining > 0) {
    localStorage.setItem(FAIL_NEXT_KEY, `${failOp}:${statusStr}x${remaining}`);
  } else {
    localStorage.removeItem(FAIL_NEXT_KEY);
  }
  const status = Number.parseInt(statusStr, 10) || 500;
  throw new DriveError(`Simulated ${op} failure (${status})`, status);
}

interface MockDoc {
  data: unknown;
  // Stand-in for Drive's md5Checksum. Prod uses a real MD5 of the stored
  // bytes; in the mock any string that changes iff the content changes is
  // sufficient (crypto.subtle doesn't support MD5 in browsers anyway).
  // Generated fresh on every write via crypto.randomUUID().
  md5: string;
  // Stand-in for Drive's modifiedTime, stamped on every write.
  modifiedTime: string;
}

interface MockState {
  settings: { data: unknown; fileId: string } | null;
  indexes: Partial<Record<Category, IndexFile>>;
  documents: Record<string, MockDoc>;
}

function emptyState(): MockState {
  return { settings: null, indexes: {}, documents: {} };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<MockState> & {
      documents?: Record<string, unknown>;
    };
    const documents: Record<string, MockDoc> = {};
    for (const [id, value] of Object.entries(parsed.documents ?? {})) {
      if (
        value && typeof value === 'object'
        && 'data' in (value as object)
        && 'md5' in (value as object)
        && 'modifiedTime' in (value as object)
      ) {
        documents[id] = value as MockDoc;
      } else if (value && typeof value === 'object' && 'data' in (value as object)) {
        documents[id] = {
          data: (value as { data: unknown }).data,
          md5: newId(),
          modifiedTime: new Date().toISOString(),
        };
      } else {
        documents[id] = { data: value, md5: newId(), modifiedTime: new Date().toISOString() };
      }
    }
    return {
      settings: parsed.settings ?? null,
      indexes: parsed.indexes ?? {},
      documents,
    };
  } catch {
    return emptyState();
  }
}

function persist(state: MockState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function requireAuth(): void {
  if (!getAccessToken()) throw new DriveError('Not authenticated', 401);
}

function newId(): string {
  return crypto.randomUUID();
}

function emptyIndex(): IndexFile {
  return { items: [] };
}

function delay(): Promise<void> {
  return new Promise((r) => setTimeout(r, LATENCY_MS));
}

export async function loadSettings<T = unknown>(): Promise<{ data: T; fileId: string | null }> {
  requireAuth();
  await delay();
  const state = load();
  if (!state.settings) return { data: null as T, fileId: null };
  return { data: state.settings.data as T, fileId: state.settings.fileId };
}

export async function saveSettings(data: unknown, existingFileId?: string | null): Promise<string> {
  requireAuth();
  await delay();
  const state = load();
  const fileId = existingFileId ?? state.settings?.fileId ?? newId();
  state.settings = { data, fileId };
  persist(state);
  return fileId;
}

export async function loadIndex(category: Category): Promise<CachedDriveIndex> {
  requireAuth();
  await delay();
  const state = load();
  const index = state.indexes[category] ?? emptyIndex();
  // The mock has no real md5; the real service uses it for optimistic
  // concurrency on index mutation, but the mock mutates state directly
  // and doesn't exercise that path. Synthesizing stable fake values
  // keeps the return shape consistent with the real service.
  return {
    items: index.items,
    fileId: state.indexes[category] ? `mock-index-${category}` : null,
    md5: state.indexes[category] ? `mock-md5-${category}` : null,
  };
}

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<{ data: T; md5: string }> {
  requireAuth();
  maybeInjectFailure('load');
  await delay();
  const state = load();
  const doc = state.documents[fileId];
  if (!doc) {
    throw new DriveError(`Drive API 404: file ${fileId} not found`, 404);
  }
  return { data: doc.data as T, md5: doc.md5 };
}

export async function createDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; md5: string; updatedAt: string; data: unknown }> {
  requireAuth();
  maybeInjectFailure('save');
  await delay();
  const { category, name, data, extraIndexFields } = args;
  const state = load();
  const fileId = newId();
  const now = new Date().toISOString();
  const md5 = newId();

  state.documents[fileId] = { data, md5, modifiedTime: now };

  const index = state.indexes[category] ?? emptyIndex();
  const entry: IndexItem = { fileId, name, updatedAt: now, ...extraIndexFields };
  index.items.push(entry);
  state.indexes[category] = index;
  persist(state);
  syncIndexCache(category, index);

  return { fileId, md5, updatedAt: now, data };
}

export async function updateDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  fileId: string;
  expectedMd5: string;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; md5: string; updatedAt: string; data: unknown }> {
  requireAuth();
  maybeInjectFailure('save');
  await delay();
  const { category, name, data, fileId, expectedMd5, extraIndexFields } = args;
  const state = load();
  const existing = state.documents[fileId];
  if (!existing) {
    throw new DriveError(`Drive API 404: file ${fileId} not found`, 404);
  }
  if (existing.md5 !== expectedMd5) {
    throw new DriveConflictError(existing.data, existing.md5, existing.modifiedTime);
  }

  const now = new Date().toISOString();
  const md5 = newId();
  state.documents[fileId] = { data, md5, modifiedTime: now };

  const index = state.indexes[category] ?? emptyIndex();
  const entry: IndexItem = { fileId, name, updatedAt: now, ...extraIndexFields };
  const existingIdx = index.items.findIndex((item) => item.fileId === fileId);
  if (existingIdx >= 0) {
    index.items[existingIdx] = entry;
  } else {
    index.items.push(entry);
  }
  state.indexes[category] = index;
  persist(state);
  syncIndexCache(category, index);

  return { fileId, md5, updatedAt: now, data };
}

export async function removeDocument(category: Category, fileId: string): Promise<void> {
  requireAuth();
  await delay();
  const state = load();
  delete state.documents[fileId];
  const index = state.indexes[category];
  if (index) {
    index.items = index.items.filter((item) => item.fileId !== fileId);
    state.indexes[category] = index;
    syncIndexCache(category, index);
  }
  persist(state);
}

export { DriveError, DriveConflictError };
