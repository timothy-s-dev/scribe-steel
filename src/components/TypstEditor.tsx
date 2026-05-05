import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import {
  EditorState,
  EditorSelection,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { linter, lintGutter, forceLinting, type Diagnostic } from '@codemirror/lint';
import { toast } from 'sonner';
import type { EditorDiagnostic } from '@/hooks/useTypstCompiler';
import { TypstEditorToolbar } from './TypstEditorToolbar';
import { uploadImage } from '@/services/google-drive';
import { typstLanguage } from '@/lib/editor/typst-language';

const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1a1c1f',
      color: '#e2e2e6',
    },
    '.cm-content': {
      caretColor: '#a5ccdf',
      fontFamily: '"Manrope", sans-serif',
    },
    '.cm-cursor': {
      borderLeftColor: '#a5ccdf',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#282a2d',
    },
    '.cm-gutters': {
      backgroundColor: '#111316',
      color: '#41474f',
      borderRight: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1a1c1f',
    },
    '.cm-activeLine': {
      backgroundColor: '#1a1c1f80',
    },
    '.cm-readonly-line': {
      opacity: '0.45',
    },
  },
  { dark: true },
);

// Diagnostics are pushed in from outside the editor (via the Typst compiler),
// not derived from the document. We keep them in a state field and let
// `linter()` read from that field, so subsequent linter refreshes don't wipe
// out diagnostics we've already attached.
const externalDiagnosticsEffect = StateEffect.define<readonly Diagnostic[]>();
const externalDiagnosticsField = StateField.define<readonly Diagnostic[]>({
  create: () => [],
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(externalDiagnosticsEffect)) return e.value;
    }
    return value;
  },
});

// `typstLanguage()` wraps codemirror-lang-typst — see that file for why we
// don't import its `typst()` factory directly. Highlighting comes from our
// own dark-theme HighlightStyle below; the package's bundled light-theme
// style is bypassed entirely (we don't include `syntaxHighlighting(...)`
// for it, since we built `typstLanguage` from primitives).
const darkSyntaxHighlight = HighlightStyle.define([
  { tag: t.heading, color: '#79c0ff', fontWeight: 'bold' },
  { tag: t.strong, color: '#ffa657', fontWeight: 'bold' },
  { tag: t.emphasis, color: '#e2e2e6', fontStyle: 'italic' },
  { tag: t.link, color: '#79c0ff', textDecoration: 'underline' },
  { tag: t.list, color: '#79c0ff' },
  { tag: t.quote, color: '#a5d6ff' },
  { tag: t.monospace, color: '#a5d6ff' },
  { tag: t.escape, color: '#d2a8ff' },

  { tag: t.comment, color: '#6e7681', fontStyle: 'italic' },

  { tag: t.string, color: '#a5d6ff' },
  { tag: t.literal, color: '#79c0ff' },

  // Keywords and operators — keep them hot enough to read against the gray
  // surface but not overpowering.
  { tag: t.controlKeyword, color: '#ff7b72' },
  { tag: t.moduleKeyword, color: '#ff7b72' },
  { tag: t.operatorKeyword, color: '#ff7b72' },
  { tag: t.definitionKeyword, color: '#ff7b72' },
  { tag: t.definitionOperator, color: '#ff7b72' },
  { tag: t.arithmeticOperator, color: '#ff7b72' },
  { tag: t.typeOperator, color: '#ff7b72' },
  { tag: t.updateOperator, color: '#ff7b72' },
  { tag: t.compareOperator, color: '#ff7b72' },
  { tag: t.controlOperator, color: '#ff7b72' },

  { tag: t.variableName, color: '#c9d1d9' },
  { tag: t.name, color: '#c9d1d9' },
  { tag: t.labelName, color: '#ffa657' },
  { tag: t.annotation, color: '#d2a8ff' },
  { tag: t.processingInstruction, color: '#d2a8ff' },
  { tag: t.documentMeta, color: '#d2a8ff' },

  // The package's defaults paint these "blue" / "hotpink" / "red" — far too
  // dark on our background. Pull them up to near-text brightness so braces
  // and brackets read clearly without competing with content.
  { tag: t.brace, color: '#e2e2e6' },
  { tag: t.bracket, color: '#e2e2e6' },
  { tag: t.paren, color: '#e2e2e6' },
  { tag: t.separator, color: '#8b949e' },
  { tag: t.punctuation, color: '#8b949e' },
  { tag: t.contentSeparator, color: '#8b949e' },

  { tag: t.invalid, color: '#f85149', textDecoration: 'underline' },
]);

const baseExtensions = [
  typstLanguage(),
  syntaxHighlighting(darkSyntaxHighlight),
  editorTheme,
  EditorView.lineWrapping,
  externalDiagnosticsField,
  linter((view) => view.state.field(externalDiagnosticsField).slice()),
  lintGutter(),
];

function inferImageExtension(file: File): string {
  const dot = file.name.lastIndexOf('.');
  if (dot > 0 && dot < file.name.length - 1) {
    return file.name.slice(dot + 1).toLowerCase();
  }
  switch (file.type) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'png';
  }
}

/**
 * Replace a unique marker string anywhere in the doc with `replacement`.
 * Used to swap a paste-time placeholder for the final `#image(...)` snippet
 * after the upload resolves — the user may have typed elsewhere in the
 * meantime, so we locate the placeholder by content rather than by saved
 * position.
 */
function replaceMarker(view: EditorView, marker: string, replacement: string): void {
  const idx = view.state.doc.toString().indexOf(marker);
  if (idx < 0) return;
  view.dispatch({
    changes: { from: idx, to: idx + marker.length, insert: replacement },
  });
}

function pasteImageExtension(readOnlyPrefixRef: { current: number }) {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.files;
      if (!items || items.length === 0) return false;
      const images = Array.from(items).filter((f) => f.type.startsWith('image/'));
      if (images.length === 0) return false;

      event.preventDefault();
      const sel = view.state.selection.main;
      if (sel.from < readOnlyPrefixRef.current) return true;

      // Insert placeholders synchronously so the cursor lands somewhere
      // visible while the upload runs. The marker has to be unique so we can
      // find and swap it once the upload resolves.
      const placeholders = images.map((file) => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const marker = `/* uploading image ${id}… */`;
        return { file, marker };
      });

      const inserted = placeholders.map((p) => p.marker).join('\n');
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: inserted },
        selection: EditorSelection.cursor(sel.from + inserted.length),
      });

      for (const { file, marker } of placeholders) {
        const ext = inferImageExtension(file);
        const name = file.name && file.name.length > 0 ? file.name : `pasted-${Date.now()}.${ext}`;
        uploadImage(file, name)
          .then((meta) => {
            const finalExt = (() => {
              const dot = meta.name.lastIndexOf('.');
              return dot > 0 ? meta.name.slice(dot + 1).toLowerCase() : ext;
            })();
            replaceMarker(view, marker, `#image("/drive/${meta.id}.${finalExt}")`);
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            replaceMarker(view, marker, `/* image upload failed: ${message} */`);
            toast.error('Image upload failed', { description: message });
          });
      }
      return true;
    },
  });
}

/**
 * Creates extensions that protect the first `len` characters from editing
 * and dim those lines visually.
 */
function readOnlyPreambleExtensions(preambleLength: number) {
  if (preambleLength <= 0) return [];

  // Block user edits that touch the preamble range, but allow
  // full-document replacements (triggered externally when the value prop
  // or preamble changes).
  const changeFilter = EditorState.changeFilter.of((tr: Transaction) => {
    if (!tr.docChanged) return true;
    const docLen = tr.startState.doc.length;
    let dominated = true;
    tr.changes.iterChangedRanges((fromA, toA) => {
      if (fromA < preambleLength || toA < preambleLength) {
        // Allow full-document replacements (external value updates)
        if (!(fromA === 0 && toA === docLen)) {
          dominated = false;
        }
      }
    });
    return dominated;
  });

  // Dim the preamble lines
  const decoField = StateField.define<DecorationSet>({
    create(state) {
      return buildDecos(state, preambleLength);
    },
    update(value, tr) {
      if (tr.docChanged) return buildDecos(tr.state, preambleLength);
      return value;
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  return [changeFilter, decoField];
}

function buildDecos(state: EditorState, preambleLength: number): DecorationSet {
  const lineDeco = Decoration.line({ class: 'cm-readonly-line' });
  const decos: { from: number; deco: Decoration }[] = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (line.from >= preambleLength) break;
    decos.push({ from: line.from, deco: lineDeco });
  }
  return Decoration.set(decos.map((d) => d.deco.range(d.from)));
}

// Convert hook-shape diagnostics (1-indexed line/col, editor-local) into
// CodeMirror's character-offset format. Clamps out-of-range positions so a
// diagnostic produced for an older document version still attaches somewhere
// sensible until the next compile lands.
function toCmDiagnostics(state: EditorState, diags: EditorDiagnostic[]): Diagnostic[] {
  const totalLines = state.doc.lines;
  const out: Diagnostic[] = [];
  for (const d of diags) {
    const sl = Math.max(1, Math.min(d.startLine, totalLines));
    const el = Math.max(sl, Math.min(d.endLine, totalLines));
    const startLine = state.doc.line(sl);
    const endLine = state.doc.line(el);
    const from = startLine.from + Math.max(0, Math.min(d.startCol - 1, startLine.length));
    const toRaw = endLine.from + Math.max(0, Math.min(d.endCol - 1, endLine.length));
    const to = Math.max(toRaw, from + 1);
    out.push({ severity: d.severity, message: d.message, from, to });
  }
  return out;
}

interface TypstEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnlyPrefix?: number;
  diagnostics?: EditorDiagnostic[];
}

// CodeMirror-based Typst editor. Provides line numbers, dark theme, and an
// optional read-only preamble range.
export function TypstEditor({
  value,
  onChange,
  readOnlyPrefix = 0,
  diagnostics,
}: TypstEditorProps) {
  const [view, setView] = useState<EditorView | null>(null);

  // The paste handler reads `readOnlyPrefix` asynchronously when an image is
  // pasted, well after render. We hand it a ref instead of the value so the
  // extensions array doesn't have to rebuild every time the prop changes —
  // rebuilding tears down and re-creates the EditorView, which would lose
  // cursor position and selection state.
  const readOnlyPrefixRef = useRef(readOnlyPrefix);
  useEffect(() => {
    readOnlyPrefixRef.current = readOnlyPrefix;
  }, [readOnlyPrefix]);

  const extensions = useMemo(
    () => [
      ...baseExtensions,
      // The extension only dereferences this ref from its paste DOM event
      // handler, never during render — safe to pass.
      // eslint-disable-next-line react-hooks/refs
      pasteImageExtension(readOnlyPrefixRef),
      ...readOnlyPreambleExtensions(readOnlyPrefix),
    ],
    [readOnlyPrefix],
  );

  useEffect(() => {
    if (!view) return;
    const cmDiags = toCmDiagnostics(view.state, diagnostics ?? []);
    view.dispatch({ effects: externalDiagnosticsEffect.of(cmDiags) });
    forceLinting(view);
  }, [view, diagnostics]);

  return (
    <div className="flex-1 min-h-[400px] flex flex-col overflow-hidden">
      <TypstEditorToolbar view={view} readOnlyPrefix={readOnlyPrefix} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme="dark"
          height="100%"
          style={{ height: '100%' }}
          onCreateEditor={(v) => setView(v)}
        />
      </div>
    </div>
  );
}
