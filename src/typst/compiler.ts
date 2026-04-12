import { $typst } from '@myriaddreamin/typst.ts/contrib/snippet';

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

export async function compileSvg(source: string): Promise<string> {
  return $typst.svg({ mainContent: source });
}

export async function compilePdf(
  source: string,
): Promise<Uint8Array | undefined> {
  return $typst.pdf({ mainContent: source });
}
