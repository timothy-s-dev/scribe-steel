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

// Thrown by updateDocument when the server's current md5Checksum doesn't
// match expectedMd5 — i.e. somebody else updated the file since we
// loaded it. Carries the remote data and md5 so the caller can surface
// a "keep local vs use remote" resolution UI without another round-trip.
//
// We use md5Checksum (not the `version` field) because Drive bumps
// `version` for internal bookkeeping that doesn't reflect a content
// change — verified empirically via dev logging. md5 only changes when
// the file's bytes change, which is exactly the semantics we want.
export class DriveConflictError extends Error {
  remoteData: unknown;
  remoteMd5: string;
  constructor(remoteData: unknown, remoteMd5: string) {
    super('Remote content has changed since load');
    this.name = 'DriveConflictError';
    this.remoteData = remoteData;
    this.remoteMd5 = remoteMd5;
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

async function createFile(folderId: string, name: string, content: unknown): Promise<string> {
  const metadata = { name, parents: [folderId], mimeType: 'application/json' };
  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const res = await driveRequest(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, { method: 'POST', body });
  const data = await res.json();
  return data.id;
}

async function updateFile(fileId: string, content: unknown): Promise<{ md5: string }> {
  const res = await driveRequest(
    `${UPLOAD_API}/files/${fileId}?uploadType=media&fields=md5Checksum`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content, null, 2),
    },
  );
  const { md5Checksum } = await res.json();
  return { md5: String(md5Checksum) };
}

async function readFile<T = unknown>(fileId: string): Promise<T> {
  const res = await driveRequest(`${API}/files/${fileId}?alt=media`);
  return res.json() as Promise<T>;
}

async function getFileMd5(fileId: string): Promise<string> {
  const res = await driveRequest(`${API}/files/${fileId}?fields=md5Checksum`);
  const { md5Checksum } = await res.json();
  return String(md5Checksum);
}

async function deleteFile(fileId: string): Promise<void> {
  await driveRequest(`${API}/files/${fileId}`, { method: 'DELETE' });
}

// ── Storage layout (dedup-safe via TanStack Query) ──────────────────────────

// Everything we discover or create once per session. Folder ids never
// change for the lifetime of the Drive account, and per-category index
// fileIds don't change once created — so this is cached at staleTime
// Infinity. `indexFiles` entries are absent until the first write for
// that category (the index.json is created lazily on demand, so a
// brand-new user's layout has all folders but no index files yet).
interface StorageLayout {
  root: string;
  folders: Record<Category, string>;
  indexFiles: Partial<Record<Category, string>>;
  settingsFile: string | null;
}

const LAYOUT_QUERY_KEY = ['internal', 'storage-layout'] as const;
const ALL_CATEGORIES: Category[] = ['monsters', 'encounters', 'handwritten', 'lore-books', 'monster-cards'];
const ROOT_FOLDER_NAME = 'Scribe Steel';

interface DiscoveredFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

// One bulk query returns every candidate folder/file we might care about;
// we rebuild the tree client-side via the `parents` field. False matches
// (another "monsters" folder, a stray "index.json" elsewhere in the
// user's Drive) are filtered out by the parent-chain walk below. The
// candidate set is small even for heavy Drive users because each query
// term is an exact name match.
async function discoverLayout(): Promise<Partial<StorageLayout>> {
  const names = [
    ROOT_FOLDER_NAME,
    ...ALL_CATEGORIES,
    'index.json',
    'settings.json',
  ];
  const q = `(${names.map((n) => `name='${n}'`).join(' or ')}) and trashed=false`;
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '1000',
  });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = (await res.json()) as { files?: DiscoveredFile[] };
  const files = data.files ?? [];

  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const root = files.find((f) => f.mimeType === FOLDER_MIME && f.name === ROOT_FOLDER_NAME);
  if (!root) return {};

  const folders: Partial<Record<Category, string>> = {};
  for (const cat of ALL_CATEGORIES) {
    const folder = files.find(
      (f) => f.mimeType === FOLDER_MIME && f.name === cat && f.parents?.includes(root.id),
    );
    if (folder) folders[cat] = folder.id;
  }

  const indexFiles: Partial<Record<Category, string>> = {};
  for (const cat of ALL_CATEGORIES) {
    const folderId = folders[cat];
    if (!folderId) continue;
    const indexFile = files.find(
      (f) => f.name === 'index.json' && f.parents?.includes(folderId),
    );
    if (indexFile) indexFiles[cat] = indexFile.id;
  }

  const settings = files.find(
    (f) => f.name === 'settings.json' && f.parents?.includes(root.id),
  );

  return {
    root: root.id,
    folders: folders as Record<Category, string>,
    indexFiles,
    settingsFile: settings?.id ?? null,
  };
}

// Create anything the bulk query didn't surface. New user: everything.
// Version upgrade (new category added): just the new folder. Steady
// state: nothing — pure no-op.
async function reconcileLayout(partial: Partial<StorageLayout>): Promise<StorageLayout> {
  const root = partial.root ?? (await createFolder(ROOT_FOLDER_NAME));
  const existing = partial.folders ?? ({} as Record<Category, string>);
  const folders: Record<Category, string> = { ...existing } as Record<Category, string>;
  for (const cat of ALL_CATEGORIES) {
    if (!folders[cat]) {
      folders[cat] = await createFolder(cat, root);
    }
  }
  return {
    root,
    folders,
    indexFiles: partial.indexFiles ?? {},
    settingsFile: partial.settingsFile ?? null,
  };
}

async function initStorageLayout(): Promise<StorageLayout> {
  const partial = await discoverLayout();
  return reconcileLayout(partial);
}

async function getLayout(): Promise<StorageLayout> {
  return queryClient.ensureQueryData({
    queryKey: LAYOUT_QUERY_KEY,
    queryFn: initStorageLayout,
    staleTime: Infinity,
  });
}

// Patch the cached layout in place. Called when we lazily create a file
// whose id we want to remember for the session (index.json on first
// write, settings.json on first save).
function patchLayout(update: (prev: StorageLayout) => StorageLayout): void {
  const current = queryClient.getQueryData<StorageLayout>(LAYOUT_QUERY_KEY);
  if (!current) return;
  queryClient.setQueryData<StorageLayout>(LAYOUT_QUERY_KEY, update(current));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Index operations (private) ──────────────────────────────────────────────

function emptyIndex(): IndexFile {
  return { version: 1, items: [] };
}

async function readIndex(category: Category): Promise<{ index: IndexFile; fileId: string | null }> {
  const layout = await getLayout();
  const indexFileId = layout.indexFiles[category] ?? null;
  if (!indexFileId) return { index: emptyIndex(), fileId: null };
  const index = await readFile<IndexFile>(indexFileId);
  return { index, fileId: indexFileId };
}

async function writeIndex(
  category: Category,
  indexFileId: string | null,
  index: IndexFile,
): Promise<string> {
  if (indexFileId) {
    await updateFile(indexFileId, index);
    return indexFileId;
  }
  const layout = await getLayout();
  const created = await createFile(layout.folders[category], 'index.json', index);
  patchLayout((prev) => ({
    ...prev,
    indexFiles: { ...prev.indexFiles, [category]: created },
  }));
  return created;
}

function stampUpdatedAt(data: unknown, now: string): unknown {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>), updatedAt: now }
    : data;
}

async function updateIndexEntry(
  category: Category,
  fileId: string,
  entry: IndexItem,
): Promise<void> {
  const { index, fileId: indexFileId } = await readIndex(category);
  const existing = index.items.findIndex((item) => item.fileId === fileId);
  if (existing >= 0) {
    index.items[existing] = entry;
  } else {
    index.items.push(entry);
  }
  await writeIndex(category, indexFileId, index);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function loadSettings<T = unknown>(): Promise<{ data: T; fileId: string | null }> {
  const { settingsFile } = await getLayout();
  if (!settingsFile) return { data: null as T, fileId: null };
  const data = await readFile<T>(settingsFile);
  return { data, fileId: settingsFile };
}

export async function saveSettings(data: unknown, existingFileId?: string | null): Promise<string> {
  const layout = await getLayout();
  const fid = existingFileId ?? layout.settingsFile;
  if (fid) {
    await updateFile(fid, data);
    return fid;
  }
  const created = await createFile(layout.root, 'settings.json', data);
  patchLayout((prev) => ({ ...prev, settingsFile: created }));
  return created;
}

export async function loadIndex(category: Category): Promise<IndexFile> {
  const { index } = await readIndex(category);
  return index;
}

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<{ data: T; md5: string }> {
  const [data, md5] = await Promise.all([
    readFile<T>(fileId),
    getFileMd5(fileId),
  ]);
  return { data, md5 };
}

export async function createDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; md5: string; updatedAt: string; data: unknown }> {
  const { category, name, data, extraIndexFields } = args;
  const folderId = (await getLayout()).folders[category];
  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);

  const fileId = await createFile(folderId, slugify(name) + '.json', stamped);
  const md5 = await getFileMd5(fileId);

  await updateIndexEntry(category, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, md5, updatedAt: now, data: stamped };
}

export async function updateDocument(args: {
  category: Category;
  name: string;
  data: unknown;
  fileId: string;
  expectedMd5: string;
  extraIndexFields?: Record<string, unknown>;
}): Promise<{ fileId: string; md5: string; updatedAt: string; data: unknown }> {
  const { category, name, data, fileId, expectedMd5, extraIndexFields } = args;

  // Application-level optimistic concurrency: Drive has no native If-Match
  // for media uploads, so we GET the current content checksum and bail if
  // it diverged since load. There's a small TOCTOU window between this
  // check and the PATCH; we accept that for a solo-user-across-devices
  // workflow.
  const currentMd5 = await getFileMd5(fileId);
  if (currentMd5 !== expectedMd5) {
    const remoteData = await readFile<unknown>(fileId);
    throw new DriveConflictError(remoteData, currentMd5);
  }

  const now = new Date().toISOString();
  const stamped = stampUpdatedAt(data, now);
  const { md5 } = await updateFile(fileId, stamped);

  await updateIndexEntry(category, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, md5, updatedAt: now, data: stamped };
}

export async function removeDocument(category: Category, fileId: string): Promise<void> {
  await deleteFile(fileId);

  const { index, fileId: indexFileId } = await readIndex(category);
  index.items = index.items.filter((item) => item.fileId !== fileId);
  if (indexFileId) {
    await writeIndex(category, indexFileId, index);
  }
}

export { DriveError };
