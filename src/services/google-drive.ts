import { getAccessToken } from './google-auth';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

class DriveError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'DriveError';
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

// ── Folders ──────────────────────────────────────────────────────────────────

export async function findFolder(
  name: string,
  parentId?: string,
): Promise<string | null> {
  const q = [
    `name='${name}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    'trashed=false',
  ];
  if (parentId) q.push(`'${parentId}' in parents`);

  const params = new URLSearchParams({
    q: q.join(' and '),
    fields: 'files(id)',
    pageSize: '1',
  });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function createFolder(
  name: string,
  parentId?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) body.parents = [parentId];

  const res = await driveRequest(`${API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.id;
}

export async function findOrCreateFolder(
  name: string,
  parentId?: string,
): Promise<string> {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;
  return createFolder(name, parentId);
}

// ── Files ────────────────────────────────────────────────────────────────────

export async function createFile(
  folderId: string,
  name: string,
  content: unknown,
): Promise<string> {
  const metadata = {
    name,
    parents: [folderId],
    mimeType: 'application/json',
  };

  const body = new FormData();
  body.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  body.append(
    'file',
    new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }),
  );

  const res = await driveRequest(
    `${UPLOAD_API}/files?uploadType=multipart&fields=id`,
    { method: 'POST', body },
  );
  const data = await res.json();
  return data.id;
}

export async function updateFile(
  fileId: string,
  content: unknown,
): Promise<void> {
  await driveRequest(
    `${UPLOAD_API}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content, null, 2),
    },
  );
}

export async function readFile<T = unknown>(fileId: string): Promise<T> {
  const res = await driveRequest(`${API}/files/${fileId}?alt=media`);
  return res.json() as Promise<T>;
}

export async function findFile(
  name: string,
  folderId: string,
): Promise<string | null> {
  const q = [
    `name='${name}'`,
    `'${folderId}' in parents`,
    'trashed=false',
  ];
  const params = new URLSearchParams({
    q: q.join(' and '),
    fields: 'files(id)',
    pageSize: '1',
  });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function listFiles(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const q = [`'${folderId}' in parents`, 'trashed=false'];
  const params = new URLSearchParams({
    q: q.join(' and '),
    fields: 'files(id,name)',
    pageSize: '1000',
  });
  const res = await driveRequest(`${API}/files?${params}`);
  const data = await res.json();
  return data.files ?? [];
}

export async function deleteFile(fileId: string): Promise<void> {
  await driveRequest(`${API}/files/${fileId}`, { method: 'DELETE' });
}

export { DriveError };
