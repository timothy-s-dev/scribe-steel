import { useState, useEffect, useRef } from 'react';
import { compileSvg, type VirtualFile } from '@/typst/compiler';

interface TypstCompilerResult {
  svg: string | null;
  error: string | null;
  loading: boolean;
}

export function useTypstCompiler(
  content: string,
  template: string,
  files: VirtualFile[] = [],
  inputs?: Record<string, string>,
): TypstCompilerResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const filesRef = useRef(files);
  filesRef.current = files;

  // Stable digest of virtual file contents for dependency tracking
  const filesDigest = files.map((f) => f.path + '\0' + f.content).join('\n');

  useEffect(() => {
    const generation = ++generationRef.current;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const source = template + content;
        const result = await compileSvg(source, filesRef.current, inputs);
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
  }, [content, template, filesDigest, inputs]);

  return { svg, error, loading };
}
