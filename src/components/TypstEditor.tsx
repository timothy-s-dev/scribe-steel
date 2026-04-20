import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { EditorState, StateField, type Transaction } from '@codemirror/state';

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

// Markdown highlighting is a reasonable approximation for Typst; real Typst
// language support is a separate concern.
const baseExtensions = [markdown(), editorTheme, EditorView.lineWrapping];

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

interface TypstEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnlyPrefix?: number;
}

// CodeMirror-based Typst editor. Provides line numbers, dark theme, and an
// optional read-only preamble range.
export function TypstEditor({ value, onChange, readOnlyPrefix = 0 }: TypstEditorProps) {
  const extensions = useMemo(
    () => [...baseExtensions, ...readOnlyPreambleExtensions(readOnlyPrefix)],
    [readOnlyPrefix],
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="dark"
        height="100%"
        style={{ height: '100%' }}
      />
    </div>
  );
}
