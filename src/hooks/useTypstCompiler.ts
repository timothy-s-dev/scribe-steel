import { useEffect, useMemo, useRef, useState } from 'react';
import { compileSvg, CompilerResetError, resetCompiler, type VirtualFile } from '@/typst/compiler';
import { parseSvgPages, type ParsedPage } from './parseSvgPages';

export type { ParsedPage };

interface TypstCompilerResult {
  pages: ParsedPage[];
  error: string | null;
  loading: boolean;
  truncated: boolean;
}

// Kept in sync with `_truncation-marker` in monster-card.typ. Any template
// that wants to surface "output was truncated" to the preview pane emits
// this string invisibly; we grep the compiled SVG for it.
const TRUNCATION_MARKER = 'SCRIBE_STEEL_PREVIEW_TRUNCATED';

export function useTypstCompiler(
  content: string,
  files: VirtualFile[],
  inputs?: Record<string, string>,
): TypstCompilerResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filesRef = useRef(files);
  filesRef.current = files;

  const filesDigest = files.map((f) => f.path + '\0' + f.content).join('\n');

  useEffect(() => {
    const generation = ++generationRef.current;
    setLoading(true);

    // If the previous compile has already made it past the debounce
    // and is running inside the worker, killing the worker reclaims
    // its WASM memory and frees us from waiting for a result we'd
    // discard anyway. The rejection lands as CompilerResetError below.
    if (inFlightRef.current) resetCompiler();

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      inFlightRef.current = true;
      try {
        const result = await compileSvg(content, filesRef.current, inputs);
        if (generation !== generationRef.current) return;
        setSvg(result);
        setError(null);
      } catch (e) {
        if (generation !== generationRef.current) return;
        if (e instanceof CompilerResetError) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (generation === generationRef.current) {
          inFlightRef.current = false;
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [content, filesDigest, inputs]);

  const pages = useMemo(() => parseSvgPages(svg), [svg]);
  const truncated = useMemo(() => svg != null && svg.includes(TRUNCATION_MARKER), [svg]);

  return { pages, error, loading, truncated };
}
