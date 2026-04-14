import {
  findOrCreateFolder,
  findFile,
  createFile,
  updateFile,
  readFile,
  deleteFile,
  listFiles,
} from './google-drive';

// ── Types ────────────────────────────────────────────────────────────────────

export interface IndexItem {
  fileId: string;
  name: string;
  updatedAt: string;
  [key: string]: unknown; // category-specific fields (level, role, ev, etc.)
}

export interface IndexFile {
  version: number;
  items: IndexItem[];
}

export type Category = 'monsters' | 'encounters' | 'letters-and-notes' | 'lore-books';

// ── Local cache keys ─────────────────────────────────────────────────────────

const FOLDERS_KEY = 'scribe-steel-folders';

function indexCacheKey(category: Category): string {
  return `scribe-steel-index-${category}`;
}

// ── Folder management ────────────────────────────────────────────────────────

interface FolderCache {
  root: string;
  [key: string]: string;
}

let folderCache: FolderCache | null = null;

function loadFolderCache(): FolderCache | null {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFolderCache(cache: FolderCache): void {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(cache));
}

export async function ensureRootFolder(): Promise<string> {
  if (folderCache?.root) return folderCache.root;

  const cached = loadFolderCache();
  if (cached?.root) {
    folderCache = cached;
    return cached.root;
  }

  const rootId = await findOrCreateFolder('Scribe Steel');
  folderCache = { root: rootId };
  saveFolderCache(folderCache);
  return rootId;
}

export async function ensureCategoryFolder(category: Category): Promise<string> {
  if (folderCache?.[category]) return folderCache[category];

  const rootId = await ensureRootFolder();
  const folderId = await findOrCreateFolder(category, rootId);

  folderCache = { ...folderCache!, [category]: folderId };
  saveFolderCache(folderCache);
  return folderId;
}

// ── Index operations ─────────────────────────────────────────────────────────

function emptyIndex(): IndexFile {
  return { version: 1, items: [] };
}

export function getCachedIndex(category: Category): IndexFile | null {
  try {
    const raw = localStorage.getItem(indexCacheKey(category));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheIndex(category: Category, index: IndexFile): void {
  localStorage.setItem(indexCacheKey(category), JSON.stringify(index));
}

async function readIndex(folderId: string): Promise<{ index: IndexFile; fileId: string | null }> {
  const indexFileId = await findFile('index.json', folderId);
  if (!indexFileId) return { index: emptyIndex(), fileId: null };
  const index = await readFile<IndexFile>(indexFileId);
  return { index, fileId: indexFileId };
}

async function writeIndex(
  folderId: string,
  indexFileId: string | null,
  index: IndexFile,
): Promise<string> {
  if (indexFileId) {
    await updateFile(indexFileId, index);
    return indexFileId;
  }
  return createFile(folderId, 'index.json', index);
}

// ── Generic document operations ──────────────────────────────────────────────

export async function loadIndex(category: Category): Promise<IndexFile> {
  const folderId = await ensureCategoryFolder(category);
  const { index } = await readIndex(folderId);
  cacheIndex(category, index);
  return index;
}

export async function saveDocument(
  category: Category,
  name: string,
  data: unknown,
  extraIndexFields?: Record<string, unknown>,
  existingFileId?: string,
): Promise<string> {
  const folderId = await ensureCategoryFolder(category);

  // Save the document file
  let fileId: string;
  const fileName = slugify(name) + '.json';
  if (existingFileId) {
    await updateFile(existingFileId, data);
    fileId = existingFileId;
  } else {
    fileId = await createFile(folderId, fileName, data);
  }

  // Update the index
  const { index, fileId: indexFileId } = await readIndex(folderId);
  const now = new Date().toISOString();
  const existing = index.items.findIndex((item) => item.fileId === fileId);
  const entry: IndexItem = {
    fileId,
    name,
    updatedAt: now,
    ...extraIndexFields,
  };

  if (existing >= 0) {
    index.items[existing] = entry;
  } else {
    index.items.push(entry);
  }

  await writeIndex(folderId, indexFileId, index);
  cacheIndex(category, index);

  return fileId;
}

export async function loadDocument<T = unknown>(
  fileId: string,
): Promise<T> {
  return readFile<T>(fileId);
}

export async function removeDocument(
  category: Category,
  fileId: string,
): Promise<void> {
  const folderId = await ensureCategoryFolder(category);

  await deleteFile(fileId);

  // Update index
  const { index, fileId: indexFileId } = await readIndex(folderId);
  index.items = index.items.filter((item) => item.fileId !== fileId);
  if (indexFileId) {
    await writeIndex(folderId, indexFileId, index);
  }
  cacheIndex(category, index);
}

export async function listDocuments(category: Category): Promise<{ id: string; name: string }[]> {
  const folderId = await ensureCategoryFolder(category);
  return listFiles(folderId);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Clear all cached folder IDs and indexes (useful on sign-out). */
export function clearCache(): void {
  folderCache = null;
  localStorage.removeItem(FOLDERS_KEY);
  const categories: Category[] = ['monsters', 'encounters', 'letters-and-notes', 'lore-books'];
  for (const c of categories) {
    localStorage.removeItem(indexCacheKey(c));
  }
}
