/// <reference lib="webworker" />
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/compiler';

export interface VirtualFile {
  path: string;
  content: string | Uint8Array;
}

export interface TypstDiagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  // Path the diagnostic refers to. May be empty for trace-only entries.
  path: string;
  // Typst's range string, e.g. "2:9-3:15". May be empty.
  range: string;
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
  | {
      id: number;
      ok: true;
      method: 'compileSvg';
      result: string;
      mainPath: string;
      diagnostics: TypstDiagnostic[];
    }
  | {
      id: number;
      ok: true;
      method: 'compilePdf';
      result: Uint8Array | undefined;
      mainPath: string;
      diagnostics: TypstDiagnostic[];
    }
  | {
      id: number;
      ok: false;
      error: string;
      mainPath: string;
      diagnostics: TypstDiagnostic[];
    };

let initResolve!: () => void;
const initialized = new Promise<void>((r) => {
  initResolve = r;
});

let mainCounter = 0;

async function ensureFiles(files: VirtualFile[]) {
  for (const file of files) {
    if (typeof file.content === 'string') {
      await $typst.addSource(file.path, file.content);
    } else {
      // mapShadow accepts arbitrary bytes; used for images and other
      // binary assets the user references via #image("...").
      await $typst.mapShadow(file.path, file.content);
    }
  }
}

function normalizeSeverity(s: string): TypstDiagnostic['severity'] {
  const v = s.toLowerCase();
  if (v === 'error' || v === 'warning' || v === 'info' || v === 'hint') return v;
  return 'error';
}

function toDiagnostics(raw: unknown, mainPath: string): TypstDiagnostic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (!d || typeof d !== 'object') return null;
      const obj = d as Record<string, unknown>;
      const severity = typeof obj.severity === 'string' ? normalizeSeverity(obj.severity) : 'error';
      const message = typeof obj.message === 'string' ? obj.message : '';
      const path = typeof obj.path === 'string' ? obj.path : '';
      const range = typeof obj.range === 'string' ? obj.range : '';
      return { severity, message, path, range } satisfies TypstDiagnostic;
    })
    .filter((d): d is TypstDiagnostic => d != null && d.message.length > 0)
    .map((d) => ({
      ...d,
      // Strip the leading slash from the synthetic main path so callers can
      // match against their mainPath in either form.
      path: d.path === mainPath || d.path === mainPath.replace(/^\//, '') ? mainPath : d.path,
    }));
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
  const mainPath = `/tmp/main-${++mainCounter}.typ`;

  try {
    await initialized;
    await ensureFiles(req.files);
    await $typst.addSource(mainPath, req.source);
    const compiler = await $typst.getCompiler();

    const format =
      req.method === 'compileSvg' ? CompileFormatEnum.vector : CompileFormatEnum.pdf;

    // Asking for `diagnostics: 'full'` switches the compiler from "throw on
    // error" to "return diagnostics in the result". We surface those to the
    // editor; warnings/hints come back here too, even on success.
    const compileResult = await compiler.compile({
      mainFilePath: mainPath,
      inputs: req.inputs,
      format,
      diagnostics: 'full',
    });

    const diagnostics = toDiagnostics(compileResult.diagnostics, mainPath);
    const hasError = diagnostics.some((d) => d.severity === 'error');

    if (!compileResult.result || hasError) {
      (self as unknown as Worker).postMessage({
        id: req.id,
        ok: false,
        error: 'Typst compilation failed',
        mainPath,
        diagnostics,
      } satisfies CompileResponse);
      return;
    }

    if (req.method === 'compileSvg') {
      const svg = await $typst.svg({ vectorData: compileResult.result });
      (self as unknown as Worker).postMessage({
        id: req.id,
        ok: true,
        method: 'compileSvg',
        result: svg,
        mainPath,
        diagnostics,
      } satisfies CompileResponse);
    } else {
      const pdf = compileResult.result;
      const transfer = pdf?.buffer ? [pdf.buffer as ArrayBuffer] : [];
      (self as unknown as Worker).postMessage(
        {
          id: req.id,
          ok: true,
          method: 'compilePdf',
          result: pdf,
          mainPath,
          diagnostics,
        } satisfies CompileResponse,
        transfer,
      );
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      mainPath,
      diagnostics: [],
    } satisfies CompileResponse);
  } finally {
    try {
      await $typst.unmapShadow(mainPath);
    } catch {
      // If unmap fails (e.g. compiler reset mid-flight), there's nothing
      // useful to do. The worker may already be terminating.
    }
  }
};
