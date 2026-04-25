import TypstWorker from './typst.worker.ts?worker';
import type { CompileResponse } from './typst.worker';

export interface VirtualFile {
  path: string;
  content: string;
}

const VERSION = '0.7.0-rc2';
const CDN = 'https://cdn.jsdelivr.net/npm';
const COMPILER_WASM_URL = `${CDN}/@myriaddreamin/typst-ts-web-compiler@${VERSION}/pkg/typst_ts_web_compiler_bg.wasm`;
const RENDERER_WASM_URL = `${CDN}/@myriaddreamin/typst-ts-renderer@${VERSION}/pkg/typst_ts_renderer_bg.wasm`;

// The WASM Typst compiler lives inside a Web Worker. Each compile call
// consumes some linear memory the compiler never gives back, so the
// main-thread proxy exposes `resetCompiler()` — terminate + respawn the
// worker — to reclaim it. That's the cancellation path too: when a
// debounced recompile supersedes an in-flight one, killing the worker
// stops the stale job mid-WASM rather than letting it run to completion
// and pile on to the memory ceiling.
//
// Respawn would be expensive if every worker had to refetch and compile
// the WASM from scratch, so we compile the two modules once on the main
// thread and hand the resulting WebAssembly.Module instances to each
// worker as an init message. Module instances are structured-cloneable
// and wasm-bindgen accepts them directly via `module_or_path`.

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

interface CachedModules {
  compilerModule: WebAssembly.Module;
  rendererModule: WebAssembly.Module;
}

let modulesPromise: Promise<CachedModules> | null = null;
let workerPromise: Promise<Worker> | null = null;
let nextId = 1;
const pending = new Map<number, Resolver>();

function getModules(): Promise<CachedModules> {
  if (!modulesPromise) {
    modulesPromise = Promise.all([
      WebAssembly.compileStreaming(fetch(COMPILER_WASM_URL)),
      WebAssembly.compileStreaming(fetch(RENDERER_WASM_URL)),
    ]).then(([compilerModule, rendererModule]) => ({ compilerModule, rendererModule }));
  }
  return modulesPromise;
}

async function spawnWorker(): Promise<Worker> {
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
    const err = new Error(e.message || 'typst worker error');
    for (const r of pending.values()) r.reject(err);
    pending.clear();
    w.terminate();
    // Clear cache so the next call spawns a fresh worker.
    if (workerPromise) workerPromise = null;
  };
  const { compilerModule, rendererModule } = await getModules();
  w.postMessage({ method: 'init', compilerModule, rendererModule });
  return w;
}

function ensureWorker(): Promise<Worker> {
  if (!workerPromise) workerPromise = spawnWorker();
  return workerPromise;
}

async function send<T>(
  method: 'compileSvg' | 'compilePdf',
  source: string,
  files: VirtualFile[],
  inputs?: Record<string, string>,
): Promise<T> {
  const w = await ensureWorker();
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
// call will spawn a fresh worker on demand, reusing the cached WASM
// modules.
export function resetCompiler(): void {
  if (!workerPromise) return;
  const promise = workerPromise;
  workerPromise = null;
  for (const r of pending.values()) r.reject(new CompilerResetError());
  pending.clear();
  promise.then((w) => w.terminate()).catch(() => {});
}
