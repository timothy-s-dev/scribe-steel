import { getAccessToken } from './google-auth';
import { queryClient } from '@/lib/queryClient';
import type { Category, IndexFile, IndexItem } from '@/data/types';

// ── Drive API internals ─────────────────────────────────────────────────────

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

class DriveError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveError';
    this.status = status;
  }
}

// Thrown by updateDocument when the server's current file version doesn't
// match expectedVersion — i.e. somebody else updated the file since we
// loaded it. Carries the remote data and version so the caller can surface
// a "keep local vs use remote" resolution UI without another round-trip.
export class DriveConflictError extends Error {
  remoteData: unknown;
  remoteVersion: number;
  constructor(remoteData: unknown, remoteVersion: number) {
    super('Remote version has changed since load');
    this.name = 'DriveConflictError';
    this.remoteData = remoteData;
    this.remoteVersion = remoteVersion;
  }
}

async function headers(): Promise<HeadersInit> {
  const token = getAccessToken();
  if (!token) throw new DriveError('Not authenticated', 401);
  return { Authorization: `Bearer ${token}` };
}

async function driveRequest(url: string, init?: RequestInit): Promise<Response> {
  const h = await headers();
  const res = await fetch(url, {
    ...init,
    headers: { ...h, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new DriveError(`Drive API ${res.status}: ${body}`, res.status);
  }
  return res;
}

// ── Low-level folder/file operations (private) ──────────────────────────────

async function findFolder(name: string, parentId?: string): Promise<string | null> {
  const q = [
    `name='${name}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    'trashed=false',
  ];
  if (parentId) q.push(`'${parentId}' in parents`);
  const params = new URLSearchParams({ q: q.join(' and '), fields: 'files(id)', pageSize: '1' });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const body: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const res = await driveRequest(`${API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.id;
}

async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

async function createFile(folderId: string, name: string, content: unknown): Promise<string> {
  const metadata = { name, parents: [folderId], mimeType: 'application/json' };
  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const res = await driveRequest(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, { method: 'POST', body });
  const data = await res.json();
  return data.id;
}

async function updateFile(fileId: string, content: unknown): Promise<{ version: number }> {
  const res = await driveRequest(`${UPLOAD_API}/files/${fileId}?uploadType=media&fields=version`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content, null, 2),
  });
  const { version } = await res.json();
  return { version: Number(version) };
}

async function readFile<T = unknown>(fileId: string): Promise<T> {
  const res = await driveRequest(`${API}/files/${fileId}?alt=media`);
  return res.json() as Promise<T>;
}

async function getFileVersion(fileId: string): Promise<number> {
  const res = await driveRequest(`${API}/files/${fileId}?fields=version`);
  const { version } = await res.json();
  return Number(version);
}

async function findFile(name: string, folderId: string): Promise<string | null> {
  const q = [`name='${name}'`, `'${folderId}' in parents`, 'trashed=false'];
  const params = new URLSearchParams({ q: q.join(' and '), fields: 'files(id)', pageSize: '1' });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function deleteFile(fileId: string): Promise<void> {
  await driveRequest(`${API}/files/${fileId}`, { method: 'DELETE' });
}

// ── Storage layout (dedup-safe via TanStack Query) ──────────────────────────

interface StorageLayout {
  root: string;
  folders: Record<Category, string>;
}

const ALL_CATEGORIES: Category[] = ['monsters', 'encounters', 'handwritten', 'lore-books', 'monster-cards'];

async function initStorageLayout(): Promise<StorageLayout> {
  const root = await findOrCreateFolder('Scribe Steel');
  const entries = await Promise.all(
    ALL_CATEGORIES.map(async (cat) => [cat, await findOrCreateFolder(cat, root)] as const),
  );
  return { root, folders: Object.fromEntries(entries) as Record<Category, string> };
}

async function getLayout(): Promise<StorageLayout> {
  return queryClient.ensureQueryData({
    queryKey: ['internal', 'storage-layout'],
    queryFn: initStorageLayout,
    staleTime: Infinity,
  });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Index operations (private) ──────────────────────────────────────────────

function emptyIndex(): IndexFile {
  return { version: 1, items: [] };
}

async function readIndex(folderId: string): Promise<{ index: IndexFile; fileId: string | null }> {
  const indexFileId = await findFile('index.json', folderId);
  if (!indexFileId) return { index: emptyIndex(), fileId: null };
  const index = await readFile<IndexFile>(indexFileId);
  return { index, fileId: indexFileId };
}

async function writeIndex(folderId: string, indexFileId: string | null, index: IndexFile): Promise<string> {
  if (indexFileId) {
    await updateFile(indexFileId, index);
    return indexFileId;
  }
  return createFile(folderId, 'index.json', index);
}

function stampUpdatedAt(data: unknown, now: string): unknown {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>), updatedAt: now }
    : data;
}

async function updateIndexEntry(
  folderId: string,
  fileId: string,
  entry: IndexItem,
): Promise<void> {
  const { index, fileId: indexFileId } = await readIndex(folderId);
  const existing = index.items.findIndex((item) => item.fileId === fileId);
  if (existing >= 0) {
    index.items[existing] = entry;
  } else {
    index.items.push(entry);
  }
  await writeIndex(folderId, indexFileId, index);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function loadSettings<T = unknown>(): Promise<{ data: T; fileId: string | null }> {
  const { root } = await getLayout();
  const fid = await findFile('settings.json', root);
  if (!fid) return { data: null as T, fileId: null };
  const data = await readFile<T>(fid);
  return { data, fileId: fid };
}

export async function saveSettings(data: unknown, existingFileId?: string | null): Promise<string> {
  const { root } = await getLayout();
  const fid = existingFileId ?? await findFile('settings.json', root);
  if (fid) {
    await updateFile(fid, data);
    return fid;
  }
  return createFile(root, 'settings.json', data);
}

export async function loadIndex(category: Category): Promise<IndexFile> {
  const folderId = (await getLayout()).folders[category];
  const { index } = await readIndex(folderId);
  return index;
}

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<{ data: T; version: number }> {
  const [data, version] = await Promise.all([
    readFile<T>(fileId),
    getFileVersion(fileId),
  ]);
  return { data, version };
}

export async function createDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; version: number; updatedAt: string; data: unknown }> {
  const { category, name, data, extraIndexFields } = args;
  const folderId = (await getLayout()).folders[category];
  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);

  const fileId = await createFile(folderId, slugify(name) + '.json', stamped);
  const version = await getFileVersion(fileId);

  await updateIndexEntry(folderId, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, version, updatedAt: now, data: stamped };
}

export async function updateDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  fileId: string;
  expectedVersion: number;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; version: number; updatedAt: string; data: unknown }> {
  const { category, name, data, fileId, expectedVersion, extraIndexFields } = args;
  const folderId = (await getLayout()).folders[category];

  // Application-level optimistic concurrency: Drive has no native If-Match,
  // so we GET the current version and bail if it diverged since load.
  // There's a small TOCTOU window between this check and the PATCH; we
  // accept that for a solo-user-across-devices workflow.
  const currentVersion = await getFileVersion(fileId);
  if (currentVersion !== expectedVersion) {
    const remoteData = await readFile<unknown>(fileId);
    throw new DriveConflictError(remoteData, currentVersion);
  }

  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);
  const { version } = await updateFile(fileId, stamped);

  await updateIndexEntry(folderId, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, version, updatedAt: now, data: stamped };
}

export async function removeDocument(category: Category, fileId: string): Promise<void> {
  const folderId = (await getLayout()).folders[category];
  await deleteFile(fileId);

  const { index, fileId: indexFileId } = await readIndex(folderId);
  index.items = index.items.filter((item) => item.fileId !== fileId);
  if (indexFileId) {
    await writeIndex(folderId, indexFileId, index);
  }
}

export { DriveError };
