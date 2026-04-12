import { useEffect } from 'react';
import { useTypstCompiler } from '@/hooks/useTypstCompiler';
import type { VirtualFile } from '@/typst/compiler';
import type { ZoomState } from '@/hooks/useZoom';

interface PreviewProps {
  content: string;
  template: string;
  files?: VirtualFile[];
  zoom: ZoomState;
  inputs?: Record<string, string>;
}

export function Preview({ content, template, files = [], zoom, inputs }: PreviewProps) {
  const { svg, error, loading } = useTypstCompiler(content, template, files, inputs);
  const pages = parseSvgPages(svg);

  // Report page dimensions to zoom controller
  useEffect(() => {
    if (pages.length > 0) {
      zoom.setPageDimensions(pages[0].width, pages[0].height);
    }
  }, [pages.length > 0 ? pages[0].width : 0, pages.length > 0 ? pages[0].height : 0]);

  if (loading && !svg) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-outline">
        Loading Typst compiler...
      </div>
    );
  }

  return (
    <div
      ref={zoom.setContainerEl}
      className="h-full overflow-auto custom-scrollbar bg-surface-container-low"
    >
      {error && (
        <div className="mx-6 mt-4 rounded-sm bg-tertiary-container/20 p-3 font-label text-xs text-tertiary whitespace-pre-wrap">
          {error}
        </div>
      )}
      {pages.length > 0 && (
        <div className="flex flex-col items-center gap-4 py-6">
          {pages.map((page, i) => (
            <div
              key={i}
              className="shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
              style={{
                width: page.width * zoom.effectiveZoom,
                height: page.height * zoom.effectiveZoom,
              }}
            >
              <div
                style={{
                  width: page.width,
                  height: page.height,
                  transform: `scale(${zoom.effectiveZoom})`,
                  transformOrigin: 'top left',
                }}
                dangerouslySetInnerHTML={{ __html: page.svg }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ParsedPage {
  width: number;
  height: number;
  svg: string;
}

function parseSvgPages(svg: string | null): ParsedPage[] {
  if (!svg) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return [];

  const pageGroups = svgEl.querySelectorAll('g.typst-page');
  if (pageGroups.length === 0) {
    const width = parseFloat(svgEl.getAttribute('data-width') || svgEl.getAttribute('width') || '596');
    const height = parseFloat(svgEl.getAttribute('data-height') || svgEl.getAttribute('height') || '842');
    return [{ width, height, svg }];
  }

  const styles = svgEl.querySelector('style')?.outerHTML || '';
  const defs = svgEl.querySelector('defs')?.outerHTML || '';

  return Array.from(pageGroups).map((group) => {
    const width = parseFloat(group.getAttribute('data-page-width') || '596');
    const height = parseFloat(group.getAttribute('data-page-height') || '842');

    const cloned = group.cloneNode(true) as Element;
    cloned.setAttribute('transform', 'translate(0, 0)');

    const pageSvg = `<svg class="typst-doc" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${styles}${defs}${cloned.outerHTML}</svg>`;

    return { width, height, svg: pageSvg };
  });
}
