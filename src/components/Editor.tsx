import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

const editorTheme = EditorView.theme({
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
}, { dark: true });

const extensions = [markdown(), editorTheme];

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="dark"
      height="100%"
      style={{ height: '100%' }}
    />
  );
}
