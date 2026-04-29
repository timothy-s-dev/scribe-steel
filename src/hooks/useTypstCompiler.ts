import { useEffect, useMemo, useRef, useState } from 'react';
import {
  compileSvg,
  CompilerResetError,
  resetCompiler,
  TypstCompileError,
  type TypstDiagnostic,
  type VirtualFile,
} from '@/lib/typst/compiler';
import { parseSvgPages, type ParsedPage } from '@/lib/typst/parseSvgPages';

export type { ParsedPage };

export interface EditorDiagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  // 1-indexed, editor-local line numbers (preamble already subtracted).
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

interface TypstCompilerResult {
  pages: ParsedPage[];
  error: string | null;
  editorDiagnostics: EditorDiagnostic[];
  loading: boolean;
  truncated: boolean;
}

// Kept in sync with `_truncation-marker` in monster-card.typ. Any template
// that wants to surface "output was truncated" to the preview pane emits
// this string invisibly; we grep the compiled SVG for it.
const TRUNCATION_MARKER = 'SCRIBE_STEEL_PREVIEW_TRUNCATED';

// Typst diagnostic ranges look like "line:col-line:col", 0-indexed (LSP-style).
// We convert to 1-indexed and subtract the preamble offset so the editor sees
// editor-local 1-indexed positions.
const RANGE_RE = /^(\d+):(\d+)-(\d+):(\d+)$/;

function buildEditorDiagnostics(
  diagnostics: TypstDiagnostic[],
  mainPath: string,
  lineOffset: number,
): EditorDiagnostic[] {
  const out: EditorDiagnostic[] = [];
  for (const d of diagnostics) {
    if (d.path !== mainPath) continue;
    const m = RANGE_RE.exec(d.range);
    if (!m) continue;
    const startLine = Number(m[1]) + 1 - lineOffset;
    const startCol = Number(m[2]) + 1;
    const endLine = Number(m[3]) + 1 - lineOffset;
    const endCol = Number(m[4]) + 1;
    if (startLine < 1 || endLine < 1) continue; // preamble — not editable
    out.push({
      severity: d.severity,
      message: d.message,
      startLine,
      startCol,
      endLine,
      endCol,
    });
  }
  return out;
}

function summarizeError(diagnostics: EditorDiagnostic[], fallback: string): string {
  const errs = diagnostics.filter((d) => d.severity === 'error').length;
  if (errs > 0) {
    return errs === 1
      ? 'Typst compilation failed (1 error). See editor for details.'
      : `Typst compilation failed (${errs} errors). See editor for details.`;
  }
  return fallback;
}

export function useTypstCompiler(
  content: string,
  files: VirtualFile[],
  inputs?: Record<string, string>,
  userContentLineOffset = 0,
): TypstCompilerResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorDiagnostics, setEditorDiagnostics] = useState<EditorDiagnostic[]>([]);
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
        setSvg(result.svg);
        setError(null);
        setEditorDiagnostics(
          buildEditorDiagnostics(result.diagnostics, result.mainPath, userContentLineOffset),
        );
      } catch (e) {
        if (generation !== generationRef.current) return;
        if (e instanceof CompilerResetError) return;
        if (e instanceof TypstCompileError) {
          const editorDiags = buildEditorDiagnostics(
            e.diagnostics,
            e.mainPath,
            userContentLineOffset,
          );
          setEditorDiagnostics(editorDiags);
          setError(summarizeError(editorDiags, 'Typst compilation failed.'));
        } else {
          setEditorDiagnostics([]);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (generation === generationRef.current) {
          inFlightRef.current = false;
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [content, filesDigest, inputs, userContentLineOffset]);

  const pages = useMemo(() => parseSvgPages(svg), [svg]);
  const truncated = useMemo(() => svg != null && svg.includes(TRUNCATION_MARKER), [svg]);

  return { pages, error, editorDiagnostics, loading, truncated };
}
