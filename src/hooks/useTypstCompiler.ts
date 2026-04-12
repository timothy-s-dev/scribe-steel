import { useState, useEffect, useRef } from 'react';
import { compileSvg } from '../typst/compiler';

interface TypstCompilerResult {
  svg: string | null;
  error: string | null;
  loading: boolean;
}

export function useTypstCompiler(
  content: string,
  template: string,
): TypstCompilerResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const generation = ++generationRef.current;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const source = template + content;
        const result = await compileSvg(source);
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
  }, [content, template]);

  return { svg, error, loading };
}
