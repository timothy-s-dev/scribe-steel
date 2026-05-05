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

/**
 * Splits raw diagnostics into two buckets:
 *  - `editor`: positional diagnostics that map onto user-editable content,
 *    expressed in editor-local 1-indexed line/col coordinates.
 *  - `unmappable`: diagnostics that lack a mappable position (different
 *    file, empty range, or inside the preamble). These typically come from
 *    file-not-found errors (e.g. a missing image referenced by path) and
 *    have no useful line/col to attach to.
 */
function buildEditorDiagnostics(
  diagnostics: TypstDiagnostic[],
  mainPath: string,
  lineOffset: number,
): { editor: EditorDiagnostic[]; unmappable: TypstDiagnostic[] } {
  const editor: EditorDiagnostic[] = [];
  const unmappable: TypstDiagnostic[] = [];
  for (const d of diagnostics) {
    if (d.path !== mainPath) {
      unmappable.push(d);
      continue;
    }
    const m = RANGE_RE.exec(d.range);
    if (!m) {
      unmappable.push(d);
      continue;
    }
    const startLine = Number(m[1]) + 1 - lineOffset;
    const startCol = Number(m[2]) + 1;
    const endLine = Number(m[3]) + 1 - lineOffset;
    const endCol = Number(m[4]) + 1;
    if (startLine < 1 || endLine < 1) {
      unmappable.push(d);
      continue;
    }
    editor.push({
      severity: d.severity,
      message: d.message,
      startLine,
      startCol,
      endLine,
      endCol,
    });
  }
  return { editor, unmappable };
}

/**
 * Surfaces unmappable diagnostics inside the editor as line-1 markers, so
 * the user always sees *something* in the lint gutter when the compile
 * fails. The original diagnostic message comes through verbatim.
 */
function unmappableToEditorDiagnostics(diags: TypstDiagnostic[]): EditorDiagnostic[] {
  return diags
    .filter((d) => d.severity === 'error' || d.severity === 'warning')
    .map((d) => ({
      severity: d.severity,
      message: d.path ? `${d.message} (${d.path})` : d.message,
      startLine: 1,
      startCol: 1,
      endLine: 1,
      endCol: 1,
    }));
}

function summarizeError(
  editorDiags: EditorDiagnostic[],
  unmappable: TypstDiagnostic[],
  fallback: string,
): string {
  const editorErrs = editorDiags.filter((d) => d.severity === 'error').length;
  const unmappableErrs = unmappable.filter((d) => d.severity === 'error');
  // When all the errors are unmappable (e.g. missing image file), inline
  // the first message so the user sees the actual problem in the preview
  // banner rather than a generic "see editor for details" pointer.
  if (editorErrs === 0 && unmappableErrs.length > 0) {
    const first = unmappableErrs[0];
    const suffix = unmappableErrs.length > 1 ? ` (+${unmappableErrs.length - 1} more)` : '';
    return `Typst compilation failed: ${first.message}${suffix}`;
  }
  const total = editorErrs + unmappableErrs.length;
  if (total > 0) {
    return total === 1
      ? 'Typst compilation failed (1 error). See editor for details.'
      : `Typst compilation failed (${total} errors). See editor for details.`;
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

  // Binary files are content-addressed by their path (Drive IDs / URLs are
  // stable, and the path encodes them), so path + byteLength is a sufficient
  // fingerprint. For string files we keep the full content in the digest.
  const filesDigest = files
    .map((f) =>
      typeof f.content === 'string'
        ? f.path + '\0s\0' + f.content
        : f.path + '\0b\0' + f.content.byteLength,
    )
    .join('\n');

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
        const split = buildEditorDiagnostics(
          result.diagnostics,
          result.mainPath,
          userContentLineOffset,
        );
        // On a successful compile, warnings without a mappable position
        // still get surfaced as line-1 markers — same UX as failure.
        setEditorDiagnostics([
          ...split.editor,
          ...unmappableToEditorDiagnostics(split.unmappable),
        ]);
      } catch (e) {
        if (generation !== generationRef.current) return;
        if (e instanceof CompilerResetError) return;
        if (e instanceof TypstCompileError) {
          const split = buildEditorDiagnostics(
            e.diagnostics,
            e.mainPath,
            userContentLineOffset,
          );
          setEditorDiagnostics([
            ...split.editor,
            ...unmappableToEditorDiagnostics(split.unmappable),
          ]);
          setError(
            summarizeError(split.editor, split.unmappable, 'Typst compilation failed.'),
          );
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
