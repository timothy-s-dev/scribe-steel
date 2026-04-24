/// <reference lib="webworker" />
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

const VERSION = '0.7.0-rc2';
const CDN = 'https://cdn.jsdelivr.net/npm';

$typst.setCompilerInitOptions({
  getModule: () => ({
    module_or_path: `${CDN}/@myriaddreamin/typst-ts-web-compiler@${VERSION}/pkg/typst_ts_web_compiler_bg.wasm`,
  }),
});

$typst.setRendererInitOptions({
  getModule: () => ({
    module_or_path: `${CDN}/@myriaddreamin/typst-ts-renderer@${VERSION}/pkg/typst_ts_renderer_bg.wasm`,
  }),
});

$typst.use(
  TypstSnippet.preloadFonts([
    '/fonts/Caveat.ttf',
    '/fonts/EBGaramond.ttf',
    '/fonts/EBGaramond-Italic.ttf',
  ]),
);

export interface VirtualFile {
  path: string;
  content: string;
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

export type CompileResponse =
  | { id: number; ok: true; method: 'compileSvg'; result: string }
  | { id: number; ok: true; method: 'compilePdf'; result: Uint8Array | undefined }
  | { id: number; ok: false; error: string };

async function ensureFiles(files: VirtualFile[]) {
  for (const file of files) {
    await $typst.addSource(file.path, file.content);
  }
}

self.onmessage = async (e: MessageEvent<CompileRequest>) => {
  const req = e.data;
  try {
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
