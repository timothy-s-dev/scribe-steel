import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import {
  EditorState,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { linter, lintGutter, forceLinting, type Diagnostic } from '@codemirror/lint';
import { Info } from 'lucide-react';
import type { EditorDiagnostic } from '@/hooks/useTypstCompiler';

const TYPST_DOCS_URL = 'https://typst.app/docs/reference/syntax/';

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

// Markdown highlighting is a reasonable approximation for Typst; real Typst
// language support is a separate concern.
const baseExtensions = [
  markdown(),
  editorTheme,
  EditorView.lineWrapping,
  externalDiagnosticsField,
  linter((view) => view.state.field(externalDiagnosticsField).slice()),
  lintGutter(),
];

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
  const viewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(
    () => [...baseExtensions, ...readOnlyPreambleExtensions(readOnlyPrefix)],
    [readOnlyPrefix],
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cmDiags = toCmDiagnostics(view.state, diagnostics ?? []);
    view.dispatch({ effects: externalDiagnosticsEffect.of(cmDiags) });
    forceLinting(view);
  }, [diagnostics]);

  return (
    <div className="flex-1 min-h-[400px] overflow-hidden relative">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="dark"
        height="100%"
        style={{ height: '100%' }}
        onCreateEditor={(view) => {
          viewRef.current = view;
          // Push any diagnostics that arrived before the editor mounted.
          if (diagnostics && diagnostics.length > 0) {
            const cmDiags = toCmDiagnostics(view.state, diagnostics);
            view.dispatch({ effects: externalDiagnosticsEffect.of(cmDiags) });
            forceLinting(view);
          }
        }}
      />
      <a
        href={TYPST_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Typst syntax reference"
        className="absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-container/80 text-on-surface-variant backdrop-blur-sm hover:bg-surface-container hover:text-on-surface transition-colors shadow-sm border border-outline-variant/30"
      >
        <Info className="h-4 w-4" />
      </a>
    </div>
  );
}
