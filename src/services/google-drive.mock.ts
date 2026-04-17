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

const STORAGE_KEY = 'scribe-steel-mock-drive-state';
const LATENCY_MS = 40;

interface MockState {
  settings: { data: unknown; fileId: string } | null;
  indexes: Partial<Record<Category, IndexFile>>;
  documents: Record<string, unknown>;
}

function emptyState(): MockState {
  return { settings: null, indexes: {}, documents: {} };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockState) : emptyState();
  } catch {
    return emptyState();
  }
}

function save(state: MockState): void {
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
  save(state);
  return fileId;
}

export async function loadIndex(category: Category): Promise<IndexFile> {
  requireAuth();
  await delay();
  const state = load();
  return state.indexes[category] ?? emptyIndex();
}

export async function loadDocument<T = unknown>(fileId: string): Promise<T> {
  requireAuth();
  await delay();
  const state = load();
  if (!(fileId in state.documents)) {
    throw new DriveError(`Drive API 404: file ${fileId} not found`, 404);
  }
  return state.documents[fileId] as T;
}

export async function saveDocument(
  category: Category,
  name: string,
  data: unknown,
  extraIndexFields?: Record<string, unknown>,
  existingFileId?: string,
): Promise<{ fileId: string; updatedAt: string; data: unknown }> {
  requireAuth();
  await delay();
  const state = load();
  const fileId = existingFileId ?? newId();

  const now = new Date().toISOString();
  const stamped =
    data && typeof data === 'object' && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), updatedAt: now }
      : data;
  state.documents[fileId] = stamped;

  const index = state.indexes[category] ?? emptyIndex();
  const existing = index.items.findIndex((item) => item.fileId === fileId);
  const entry: IndexItem = { fileId, name, updatedAt: now, ...extraIndexFields };
  if (existing >= 0) {
    index.items[existing] = entry;
  } else {
    index.items.push(entry);
  }
  state.indexes[category] = index;
  save(state);
  return { fileId, updatedAt: now, data: stamped };
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
  save(state);
}

export { DriveError };
