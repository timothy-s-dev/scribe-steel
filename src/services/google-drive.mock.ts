// Mock replacement for google-drive.ts. Swapped in via Vite `resolve.alias`
// when VITE_USE_MOCK_DRIVE is set. All state lives in localStorage keyed by
// STORAGE_KEY; sign-out does not clear it, matching prod behavior where your
// Drive data survives re-login.

import { getAccessToken } from './google-auth.mock';
import type { Category, IndexFile, IndexItem } from '@/data/types';

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
  remoteVersion: number;
  constructor(remoteData: unknown, remoteVersion: number) {
    super('Remote version has changed since load');
    this.name = 'DriveConflictError';
    this.remoteData = remoteData;
    this.remoteVersion = remoteVersion;
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
  version: number;
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
      // Pre-versioning shape: documents was Record<string, unknown>.
      // Migrate transparently so older mock state doesn't crash.
      documents?: Record<string, unknown>;
    };
    const documents: Record<string, MockDoc> = {};
    for (const [id, value] of Object.entries(parsed.documents ?? {})) {
      documents[id] =
        value && typeof value === 'object' && 'data' in (value as object) && 'version' in (value as object)
          ? (value as MockDoc)
          : { data: value, version: 1 };
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
  return { version: 1, items: [] };
}

function delay(): Promise<void> {
  return new Promise((r) => setTimeout(r, LATENCY_MS));
}

function stampUpdatedAt(data: unknown, now: string): unknown {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>), updatedAt: now }
    : data;
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

export async function loadIndex(category: Category): Promise<IndexFile> {
  requireAuth();
  await delay();
  const state = load();
  return state.indexes[category] ?? emptyIndex();
}

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<{ data: T; version: number }> {
  requireAuth();
  maybeInjectFailure('load');
  await delay();
  const state = load();
  const doc = state.documents[fileId];
  if (!doc) {
    throw new DriveError(`Drive API 404: file ${fileId} not found`, 404);
  }
  return { data: doc.data as T, version: doc.version };
}

export async function createDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; version: number; updatedAt: string; data: unknown }> {
  requireAuth();
  maybeInjectFailure('save');
  await delay();
  const { category, name, data, extraIndexFields } = args;
  const state = load();
  const fileId = newId();
  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);

  state.documents[fileId] = { data: stamped, version: 1 };

  const index = state.indexes[category] ?? emptyIndex();
  const entry: IndexItem = { fileId, name, updatedAt: now, ...extraIndexFields };
  index.items.push(entry);
  state.indexes[category] = index;
  persist(state);

  return { fileId, version: 1, updatedAt: now, data: stamped };
}

export async function updateDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  fileId: string;
  expectedVersion: number;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; version: number; updatedAt: string; data: unknown }> {
  requireAuth();
  maybeInjectFailure('save');
  await delay();
  const { category, name, data, fileId, expectedVersion, extraIndexFields } = args;
  const state = load();
  const existing = state.documents[fileId];
  if (!existing) {
    throw new DriveError(`Drive API 404: file ${fileId} not found`, 404);
  }
  if (existing.version !== expectedVersion) {
    throw new DriveConflictError(existing.data, existing.version);
  }

  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);
  const version = existing.version + 1;
  state.documents[fileId] = { data: stamped, version };

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

  return { fileId, version, updatedAt: now, data: stamped };
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
  }
  persist(state);
}

export { DriveError, DriveConflictError };
