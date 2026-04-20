import { Editor } from '@/components/Editor';

interface TypstEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnlyPrefix?: number;
}

// Thin wrapper around the CodeMirror Editor for Typst content. Today's
// highlighting reuses markdown mode inherited from Editor; adding real Typst
// language support is a separate concern.
export function TypstEditor({ value, onChange, readOnlyPrefix }: TypstEditorProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <Editor value={value} onChange={onChange} readOnlyPrefix={readOnlyPrefix} />
    </div>
  );
}
