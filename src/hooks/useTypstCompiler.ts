import { useEffect, useMemo, useRef, useState } from 'react';
import { compileSvg, type VirtualFile } from '@/typst/compiler';

export interface ParsedPage {
  width: number;
  height: number;
  svg: string;
}

interface TypstCompilerResult {
  pages: ParsedPage[];
  error: string | null;
  loading: boolean;
}

export function useTypstCompiler(
  content: string,
  files: VirtualFile[],
  inputs?: Record<string, string>,
): TypstCompilerResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filesRef = useRef(files);
  filesRef.current = files;

  const filesDigest = files.map((f) => f.path + '\0' + f.content).join('\n');

  useEffect(() => {
    const generation = ++generationRef.current;
    setLoading(true);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await compileSvg(content, filesRef.current, inputs);
        if (generation !== generationRef.current) return;
        setSvg(result);
        setError(null);
      } catch (e) {
        if (generation !== generationRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (generation === generationRef.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [content, filesDigest, inputs]);

  const pages = useMemo(() => parseSvgPages(svg), [svg]);

  return { pages, error, loading };
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
