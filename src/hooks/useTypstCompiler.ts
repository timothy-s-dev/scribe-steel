import { useEffect, useMemo, useRef, useState } from 'react';
import { compileSvg, type VirtualFile } from '@/typst/compiler';
import { parseSvgPages, type ParsedPage } from './parseSvgPages';

export type { ParsedPage };

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
