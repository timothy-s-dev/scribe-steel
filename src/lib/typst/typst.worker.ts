/// <reference lib="webworker" />
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

export interface VirtualFile {
  path: string;
  content: string;
}

interface InitRequest {
  method: 'init';
  compilerModule: WebAssembly.Module;
  rendererModule: WebAssembly.Module;
}

type CompileRequest =
  | {
      id: number;
      method: 'compileSvg';
      source: string;
      files: VirtualFile[];
      inputs?: Record<string, string>;
    }
  | {
      id: number;
      method: 'compilePdf';
      source: string;
      files: VirtualFile[];
      inputs?: Record<string, string>;
    };

type IncomingMessage = InitRequest | CompileRequest;

export type CompileResponse =
  | { id: number; ok: true; method: 'compileSvg'; result: string }
  | { id: number; ok: true; method: 'compilePdf'; result: Uint8Array | undefined }
  | { id: number; ok: false; error: string };

let initResolve!: () => void;
const initialized = new Promise<void>((r) => {
  initResolve = r;
});

async function ensureFiles(files: VirtualFile[]) {
  for (const file of files) {
    await $typst.addSource(file.path, file.content);
  }
}

self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data;

  if (msg.method === 'init') {
    // The main thread compiles these WebAssembly.Modules once and ships
    // the same instances to every worker we spawn, so respawn cost is
    // "instantiate" (tens of ms) rather than "fetch + compile" (hundreds).
    $typst.setCompilerInitOptions({
      getModule: () => ({ module_or_path: msg.compilerModule }),
    });
    $typst.setRendererInitOptions({
      getModule: () => ({ module_or_path: msg.rendererModule }),
    });
    $typst.use(
      TypstSnippet.preloadFonts([
        '/fonts/Caveat.ttf',
        '/fonts/EBGaramond.ttf',
        '/fonts/EBGaramond-Italic.ttf',
      ]),
    );
    initResolve();
    return;
  }

  const req = msg;
  try {
    await initialized;
    await ensureFiles(req.files);
    if (req.method === 'compileSvg') {
      const result = await $typst.svg({ mainContent: req.source, inputs: req.inputs });
      (self as unknown as Worker).postMessage({
        id: req.id,
        ok: true,
        method: 'compileSvg',
        result,
      } satisfies CompileResponse);
    } else {
      const result = await $typst.pdf({ mainContent: req.source, inputs: req.inputs });
      const transfer = result?.buffer ? [result.buffer as ArrayBuffer] : [];
      (self as unknown as Worker).postMessage(
        {
          id: req.id,
          ok: true,
          method: 'compilePdf',
          result,
        } satisfies CompileResponse,
        transfer,
      );
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies CompileResponse);
  }
};
