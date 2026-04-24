import TypstWorker from './typst.worker.ts?worker';
import type { CompileResponse } from './typst.worker';

export interface VirtualFile {
  path: string;
  content: string;
}

// The WASM Typst compiler lives inside a Web Worker. Each compile call
// consumes some linear memory the compiler never gives back, so the
// main-thread proxy exposes `resetCompiler()` — terminate + respawn the
// worker — to reclaim it. That's the cancellation path too: when a
// debounced recompile supersedes an in-flight one, killing the worker
// stops the stale job mid-WASM rather than letting it run to completion
// and pile on to the memory ceiling.

type Resolver = {
  method: 'compileSvg' | 'compilePdf';
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

export class CompilerResetError extends Error {
  constructor() {
    super('compiler reset');
    this.name = 'CompilerResetError';
  }
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Resolver>();

function ensureWorker(): Worker {
  if (worker) return worker;
  const w = new TypstWorker();
  w.onmessage = (e: MessageEvent<CompileResponse>) => {
    const msg = e.data;
    const resolver = pending.get(msg.id);
    if (!resolver) return;
    pending.delete(msg.id);
    if (msg.ok) resolver.resolve(msg.result);
    else resolver.reject(new Error(msg.error));
  };
  w.onerror = (e) => {
    // Worker-level failure: reject everything outstanding and force a
    // fresh spawn on the next request.
    const err = new Error(e.message || 'typst worker error');
    for (const r of pending.values()) r.reject(err);
    pending.clear();
    w.terminate();
    if (worker === w) worker = null;
  };
  worker = w;
  return w;
}

function send<T>(
  method: 'compileSvg' | 'compilePdf',
  source: string,
  files: VirtualFile[],
  inputs?: Record<string, string>,
): Promise<T> {
  const w = ensureWorker();
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { method, resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ id, method, source, files, inputs });
  });
}

export function compileSvg(
  source: string,
  files: VirtualFile[] = [],
  inputs?: Record<string, string>,
): Promise<string> {
  return send<string>('compileSvg', source, files, inputs);
}

export function compilePdf(
  source: string,
  files: VirtualFile[] = [],
  inputs?: Record<string, string>,
): Promise<Uint8Array | undefined> {
  return send<Uint8Array | undefined>('compilePdf', source, files, inputs);
}

// Terminate the worker and reject any outstanding requests. Callers
// should treat the rejection as benign cancellation — the next compile
// call will spawn a fresh worker on demand.
export function resetCompiler(): void {
  if (!worker) return;
  const w = worker;
  worker = null;
  for (const r of pending.values()) r.reject(new CompilerResetError());
  pending.clear();
  w.terminate();
}
