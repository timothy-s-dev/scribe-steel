export interface ParsedPage {
  width: number;
  height: number;
  svg: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAGE_MARKER = /<g\s+class="typst-page"/g;

// Splits a Typst-emitted SVG string into its per-page <svg> fragments by
// string scanning — no DOMParser. Typst's output is shaped as:
//   <svg ...>
//     <style ...>...</style>
//     <defs ...>...</defs>
//     <g class="typst-page" ...>...</g>
//     <g class="typst-page" ...>...</g>
//     ...
//     <script>...</script>  (sometimes)
//   </svg>
// Pages are flat siblings, never nested inside each other.
export function parseSvgPages(svg: string | null): ParsedPage[] {
  if (!svg) return [];

  const markers: number[] = [];
  PAGE_MARKER.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_MARKER.exec(svg)) !== null) markers.push(m.index);

  if (markers.length === 0) {
    const rootOpen = openerOf(svg, svg.indexOf('<svg'));
    if (!rootOpen) return [];
    const width = parseFloat(readAttr(rootOpen, 'data-width') ?? readAttr(rootOpen, 'width') ?? '596');
    const height = parseFloat(readAttr(rootOpen, 'data-height') ?? readAttr(rootOpen, 'height') ?? '842');
    return [{ width, height, svg }];
  }

  // Typst emits CRLF line endings inside <style>; DOMParser + outerHTML
  // normalize those to LF during serialization. Strip CR here so the
  // emitted page SVGs match what the browser-based pipeline produced.
  const styleRaw = (matchBlock(svg, 'style') ?? '').replace(/\r\n/g, '\n');
  const defsRaw = (matchBlock(svg, 'defs') ?? '').replace(/\r\n/g, '\n');
  // The old DOMParser-based impl pulled these via `element.outerHTML`,
  // which injects `xmlns="..."` onto every element in a foreign namespace
  // during serialization. We replicate that so downstream consumers see
  // the same markup.
  const styles = injectXmlns(styleRaw, 'style');
  const defs = injectXmlns(defsRaw, 'defs');

  const pages: ParsedPage[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i];
    const end = i + 1 < markers.length ? markers[i + 1] : endOfPages(svg);

    const chunk = svg.slice(start, end);
    const openerEnd = chunk.indexOf('>');
    if (openerEnd === -1) continue;
    const opener = chunk.slice(0, openerEnd);
    const rest = chunk.slice(openerEnd);

    const width = parseFloat(readAttr(opener, 'data-page-width') ?? '596');
    const height = parseFloat(readAttr(opener, 'data-page-height') ?? '842');

    // Replace the page wrapper's own transform with translate(0, 0) so
    // each extracted page renders at its own origin regardless of where
    // it sat in the full-document layout. Attributes nested inside the
    // page body are untouched.
    // Replace the page's transform, and inject xmlns="..." onto the
    // outer <g> — the old DOMParser path gets this for free because
    // cloneNode+outerHTML re-serializes the subtree with namespace
    // declarations at its root.
    const normalizedOpener = opener
      .replace(/\s+transform="[^"]*"/, ' transform="translate(0, 0)"')
      .replace(/^<g\b/, `<g xmlns="${SVG_NS}"`);
    const pageNode = normalizedOpener + rest;

    const pageSvg =
      `<svg class="typst-doc" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink">` +
      styles +
      defs +
      pageNode +
      `</svg>`;

    pages.push({ width, height, svg: pageSvg });
  }
  return pages;
}

// Returns the opening tag (without the `>`) starting at `start`, or null.
function openerOf(svg: string, start: number): string | null {
  if (start < 0) return null;
  const end = svg.indexOf('>', start);
  if (end === -1) return null;
  return svg.slice(start, end);
}

// Match a top-level `<tag ...>...</tag>` block by name; returns the full
// substring (opener + body + closer) or null.
function matchBlock(svg: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`);
  return re.exec(svg)?.[0] ?? null;
}

function readAttr(opener: string, name: string): string | undefined {
  const re = new RegExp(`\\b${name}="([^"]*)"`);
  return re.exec(opener)?.[1];
}

function injectXmlns(block: string, tag: string): string {
  if (!block) return '';
  if (block.includes('xmlns=')) return block;
  return block.replace(new RegExp(`^<${tag}\\b`), `<${tag} xmlns="${SVG_NS}"`);
}

// Where page content ends: at the trailing `<script>` if present,
// otherwise at the closing `</svg>`.
function endOfPages(svg: string): number {
  const scriptIdx = svg.lastIndexOf('<script');
  if (scriptIdx !== -1) return scriptIdx;
  const svgClose = svg.lastIndexOf('</svg>');
  return svgClose === -1 ? svg.length : svgClose;
}
