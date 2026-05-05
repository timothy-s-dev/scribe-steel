import type { VirtualFile } from './compiler';
import { fetchImageBytes } from '@/services/google-drive';

export interface ResolverDiagnostic {
  severity: 'error' | 'warning';
  message: string;
  path: string;
}

export interface ResolverResult {
  files: VirtualFile[];
  errors: ResolverDiagnostic[];
}

const IMAGE_REF_RE = /(?:#)?image\s*\(\s*"([^"]+)"/g;

const cache = new Map<string, Promise<VirtualFile | ResolverDiagnostic>>();

/**
 * Test-only escape hatch — clears the in-memory image cache. Production code
 * never calls this; the cache lives for the session because Drive IDs and
 * URLs are content-stable.
 */
export function _resetImageResolverCache(): void {
  cache.clear();
}

export function extractImageRefs(content: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of content.matchAll(IMAGE_REF_RE)) {
    const path = match[1];
    if (!seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  }
  return out;
}

function resolveOne(path: string): Promise<VirtualFile | ResolverDiagnostic> {
  const cached = cache.get(path);
  if (cached) return cached;
  const promise = doResolve(path).catch(
    (err): ResolverDiagnostic => ({
      severity: 'error',
      message:
        err instanceof Error ? err.message : `Failed to fetch image: ${String(err)}`,
      path,
    }),
  );
  cache.set(path, promise);
  return promise;
}

async function doResolve(path: string): Promise<VirtualFile | ResolverDiagnostic> {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const res = await fetch(path);
    if (!res.ok) {
      return {
        severity: 'error',
        message: `Image fetch failed (HTTP ${res.status}): ${path}`,
        path,
      };
    }
    const buf = await res.arrayBuffer();
    return { path, content: new Uint8Array(buf) };
  }
  if (path.startsWith('/drive/')) {
    const rest = path.slice('/drive/'.length);
    // Strip extension if present — Drive needs just the file ID.
    const dot = rest.lastIndexOf('.');
    const id = dot > 0 ? rest.slice(0, dot) : rest;
    if (!id) {
      return {
        severity: 'error',
        message: `Invalid Drive image reference: "${path}"`,
        path,
      };
    }
    const { bytes } = await fetchImageBytes(id);
    return { path, content: bytes };
  }
  return {
    severity: 'error',
    message: `Unrecognized image path "${path}". Use /drive/<id>.<ext> or an http(s):// URL.`,
    path,
  };
}

function isVirtualFile(x: VirtualFile | ResolverDiagnostic): x is VirtualFile {
  return 'content' in x;
}

export async function resolveImages(content: string): Promise<ResolverResult> {
  const refs = extractImageRefs(content);
  if (refs.length === 0) return { files: [], errors: [] };
  const resolved = await Promise.all(refs.map((p) => resolveOne(p)));
  const files: VirtualFile[] = [];
  const errors: ResolverDiagnostic[] = [];
  for (const r of resolved) {
    if (isVirtualFile(r)) files.push(r);
    else errors.push(r);
  }
  return { files, errors };
}
