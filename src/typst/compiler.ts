import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';

const VERSION = '0.7.0-rc2';
const CDN = `https://cdn.jsdelivr.net/npm`;

$typst.setCompilerInitOptions({
  getModule: () =>
    `${CDN}/@myriaddreamin/typst-ts-web-compiler@${VERSION}/pkg/typst_ts_web_compiler_bg.wasm`,
});

$typst.setRendererInitOptions({
  getModule: () =>
    `${CDN}/@myriaddreamin/typst-ts-renderer@${VERSION}/pkg/typst_ts_renderer_bg.wasm`,
});

// Preload full (un-subset) fonts needed by templates.
// These are variable fonts from the google/fonts repo, served from public/.
// The Google Fonts CDN strips OpenType features like smcp (small caps),
// so we bundle the originals instead.
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

let registeredFiles = new Set<string>();

async function ensureFiles(files: VirtualFile[]) {
  for (const file of files) {
    if (!registeredFiles.has(file.path)) {
      await $typst.addSource(file.path, file.content);
      registeredFiles.add(file.path);
    }
  }
}

export async function compileSvg(
  source: string,
  files: VirtualFile[] = [],
  inputs?: Record<string, string>,
): Promise<string> {
  await ensureFiles(files);
  return $typst.svg({ mainContent: source, inputs });
}

export async function compilePdf(
  source: string,
  files: VirtualFile[] = [],
  inputs?: Record<string, string>,
): Promise<Uint8Array | undefined> {
  await ensureFiles(files);
  return $typst.pdf({ mainContent: source, inputs });
}
