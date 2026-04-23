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
// loaded it. Carries the remote data, md5, and modifiedTime so the
// caller can surface a "keep local vs use remote" resolution UI without
// another round-trip.
export class DriveConflictError extends Error {
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

interface FileMeta {
  md5: string;
  modifiedTime: string;
}

async function updateFile(fileId: string, content: unknown): Promise<FileMeta> {
  const res = await driveRequest(
    `${UPLOAD_API}/files/${fileId}?uploadType=media&fields=md5Checksum,modifiedTime`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content, null, 2),
    },
  );
  const { md5Checksum, modifiedTime } = await res.json();
  return { md5: String(md5Checksum), modifiedTime: String(modifiedTime) };
}

async function readFile<T = unknown>(fileId: string): Promise<T> {
  const res = await driveRequest(`${API}/files/${fileId}?alt=media`);
  return res.json() as Promise<T>;
}

async function getFileMeta(fileId: string): Promise<FileMeta> {
  const res = await driveRequest(`${API}/files/${fileId}?fields=md5Checksum,modifiedTime`);
  const { md5Checksum, modifiedTime } = await res.json();
  return { md5: String(md5Checksum), modifiedTime: String(modifiedTime) };
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

// Cache value for per-category index state. `items` is the raw Drive
// side of the list — useIndex's `select` layers static items on top for
// the UI, and the service keeps items+fileId+md5 in sync here so we can
// do md5-based optimistic concurrency on mutation without re-fetching
// the full content. fileId/md5 are null until the first index.json is
// created for that category.
export interface CachedDriveIndex {
  items: IndexItem[];
  fileId: string | null;
  md5: string | null;
}

// Shared with useIndex so the hook and the service read/write the same
// react-query entry. isSignedIn is always true for service-initiated
// access because every drive call requires an auth token.
export const indexQueryKey = (category: Category, isSignedIn: boolean) =>
  [category, 'index', isSignedIn] as const;

function emptyCachedIndex(): CachedDriveIndex {
  return { items: [], fileId: null, md5: null };
}

// Populated on first read and refreshed in place on every mutation —
// see refreshDriveIndex / writeDriveIndex below.
export async function loadIndex(category: Category): Promise<CachedDriveIndex> {
  const layout = await getLayout();
  const indexFileId = layout.indexFiles[category] ?? null;
  if (!indexFileId) return emptyCachedIndex();
  const [index, meta] = await Promise.all([
    readFile<IndexFile>(indexFileId),
    getFileMeta(indexFileId),
  ]);
  return { items: index.items, fileId: indexFileId, md5: meta.md5 };
}

function getCachedIndex(category: Category): CachedDriveIndex | undefined {
  return queryClient.getQueryData<CachedDriveIndex>(indexQueryKey(category, true));
}

function setCachedIndex(category: Category, next: CachedDriveIndex): void {
  queryClient.setQueryData<CachedDriveIndex>(indexQueryKey(category, true), next);
}

// Returns the Drive-side index we should mutate against. When our cached
// md5 matches Drive's current md5 (via a tiny meta-only GET), we trust
// the cached items and skip the full-content re-fetch. On mismatch —
// a cross-device edit since load — we re-read the file and refresh the
// cache. When there's no cache yet (service called before useIndex
// populated it) or no file yet, we fall through to a full load.
async function refreshDriveIndex(category: Category): Promise<CachedDriveIndex> {
  const cached = getCachedIndex(category);
  if (!cached || !cached.fileId || !cached.md5) {
    const fresh = await loadIndex(category);
    setCachedIndex(category, fresh);
    return fresh;
  }
  const meta = await getFileMeta(cached.fileId);
  if (meta.md5 === cached.md5) return cached;
  const fresh = await readFile<IndexFile>(cached.fileId);
  const next: CachedDriveIndex = {
    items: fresh.items,
    fileId: cached.fileId,
    md5: meta.md5,
  };
  setCachedIndex(category, next);
  return next;
}

async function writeDriveIndex(
  category: Category,
  base: CachedDriveIndex,
  nextItems: IndexItem[],
): Promise<void> {
  const body: IndexFile = { items: nextItems };
  if (base.fileId) {
    const { md5 } = await updateFile(base.fileId, body);
    setCachedIndex(category, { ...base, items: nextItems, md5 });
    return;
  }
  const layout = await getLayout();
  const created = await createFile(layout.folders[category], 'index.json', body);
  const meta = await getFileMeta(created);
  patchLayout((prev) => ({
    ...prev,
    indexFiles: { ...prev.indexFiles, [category]: created },
  }));
  setCachedIndex(category, { items: nextItems, fileId: created, md5: meta.md5 });
}

async function updateIndexEntry(
  category: Category,
  fileId: string,
  entry: IndexItem,
): Promise<void> {
  const base = await refreshDriveIndex(category);
  const idx = base.items.findIndex((item) => item.fileId === fileId);
  const items = idx >= 0
    ? base.items.map((item, i) => (i === idx ? entry : item))
    : [...base.items, entry];
  await writeDriveIndex(category, base, items);
}

async function removeIndexEntry(category: Category, fileId: string): Promise<void> {
  const base = await refreshDriveIndex(category);
  if (!base.fileId) return;
  const items = base.items.filter((item) => item.fileId !== fileId);
  if (items.length === base.items.length) return;
  await writeDriveIndex(category, base, items);
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

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<{ data: T; md5: string }> {
  const [data, meta] = await Promise.all([
    readFile<T>(fileId),
    getFileMeta(fileId),
  ]);
  return { data, md5: meta.md5 };
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

  const fileId = await createFile(folderId, slugify(name) + '.json', data);
  const meta = await getFileMeta(fileId);

  await updateIndexEntry(category, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, md5: meta.md5, updatedAt: now, data };
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
  const current = await getFileMeta(fileId);
  if (current.md5 !== expectedMd5) {
    const remoteData = await readFile<unknown>(fileId);
    throw new DriveConflictError(remoteData, current.md5, current.modifiedTime);
  }

  const now = new Date().toISOString();
  const { md5 } = await updateFile(fileId, data);

  await updateIndexEntry(category, fileId, {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  });

  return { fileId, md5, updatedAt: now, data };
}

export async function removeDocument(category: Category, fileId: string): Promise<void> {
  await deleteFile(fileId);
  await removeIndexEntry(category, fileId);
}

export { DriveError };
