import { useEffect, useMemo, useRef, useState } from 'react';
import {
  extractImageRefs,
  resolveImages,
  type ResolverDiagnostic,
} from '@/lib/typst/image-resolver';
import type { VirtualFile } from '@/lib/typst/compiler';
import type { EditorDiagnostic } from './useTypstCompiler';

interface ResolvedImageFiles {
  files: VirtualFile[];
  errors: EditorDiagnostic[];
  loading: boolean;
}

const EMPTY_FILES: VirtualFile[] = [];
const EMPTY_ERRORS: EditorDiagnostic[] = [];

/**
 * Walks the user's Typst source for `#image("…")` references, fetches each
 * referenced image from Drive (or via http(s) URL), and exposes them as
 * VirtualFiles ready to feed into useTypstCompiler. Failures surface as
 * EditorDiagnostics positioned at the offending `image(...)` call so they
 * land in the editor's lint gutter.
 *
 * The resolver itself caches by path, so re-renders don't re-fetch.
 *
 * `userContentLineOffset` mirrors the value used by useTypstCompiler — when
 * scanning the built source (preamble + user content), we subtract it so
 * diagnostics align with the editor-local coordinates the editor expects.
 * References that fall inside the preamble (line < 1 after subtraction) are
 * dropped; they're not editable so a marker would be useless.
 */
export function useResolvedImageFiles(
  content: string,
  userContentLineOffset = 0,
): ResolvedImageFiles {
  // Stable refs digest — same set, same order → don't re-resolve.
  const refsDigest = useMemo(() => extractImageRefs(content).join('\n'), [content]);

  const [files, setFiles] = useState<VirtualFile[]>(EMPTY_FILES);
  const [errors, setErrors] = useState<EditorDiagnostic[]>(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (refsDigest.length === 0) {
      setFiles(EMPTY_FILES);
      setErrors(EMPTY_ERRORS);
      setLoading(false);
      return;
    }
    setLoading(true);
    void resolveImages(content).then((result) => {
      if (generation !== generationRef.current) return;
      setFiles(result.files);
      setErrors(toEditorDiagnostics(content, result.errors, userContentLineOffset));
      setLoading(false);
    });
    // We deliberately key on refsDigest, not content — typing inside an image
    // string only changes the resolution when the path itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsDigest]);

  return { files, errors, loading };
}

const IMAGE_REF_RE_GLOBAL = /(?:#)?image\s*\(\s*"([^"]+)"/g;

/**
 * Maps resolver diagnostics back to editor coordinates by re-scanning the
 * content for the offending path. We don't try to disambiguate when the same
 * path appears in multiple places — a missing image is a missing image, and
 * showing the diagnostic at every callsite is the correct thing.
 */
function toEditorDiagnostics(
  content: string,
  errors: ResolverDiagnostic[],
  userContentLineOffset: number,
): EditorDiagnostic[] {
  if (errors.length === 0) return EMPTY_ERRORS;
  const byPath = new Map<string, ResolverDiagnostic>();
  for (const e of errors) byPath.set(e.path, e);

  const out: EditorDiagnostic[] = [];
  for (const match of content.matchAll(IMAGE_REF_RE_GLOBAL)) {
    const path = match[1];
    const err = byPath.get(path);
    if (!err) continue;
    const offset = match.index ?? 0;
    const end = offset + match[0].length;
    const start = offsetToLineCol(content, offset);
    const finish = offsetToLineCol(content, end);
    const startLine = start.line - userContentLineOffset;
    const endLine = finish.line - userContentLineOffset;
    if (startLine < 1) continue; // inside preamble — not user-editable
    out.push({
      severity: err.severity,
      message: err.message,
      startLine,
      startCol: start.col,
      endLine,
      endCol: finish.col,
    });
  }
  return out;
}

function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}
