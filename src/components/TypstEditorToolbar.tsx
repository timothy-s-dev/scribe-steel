import { useState } from 'react';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Info,
  Italic,
  List,
  ListOrdered,
} from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { Button } from '@/components/shadcn/button';
import {
  insertAtCursor,
  setHeadingLevel,
  toggleWrap,
  togglePrefixOnSelectedLines,
} from '@/lib/editor/typst-commands';
import { ImagePickerDialog } from './ImagePickerDialog';

const TYPST_DOCS_URL = 'https://typst.app/docs/reference/syntax/';

interface TypstEditorToolbarProps {
  view: EditorView | null;
  readOnlyPrefix?: number;
}

export function TypstEditorToolbar({ view, readOnlyPrefix = 0 }: TypstEditorToolbarProps) {
  const disabled = view === null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const run = (fn: (v: EditorView) => void) => () => {
    if (view) fn(view);
  };

  return (
    <div className="relative z-10 flex items-center gap-0.5 h-9 px-2 bg-surface-container border-b border-outline-variant/30 flex-shrink-0">
      <ToolbarButton
        title="Bold (*text*)"
        disabled={disabled}
        onClick={run((v) => toggleWrap(v, '*', '*', readOnlyPrefix))}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic (_text_)"
        disabled={disabled}
        onClick={run((v) => toggleWrap(v, '_', '_', readOnlyPrefix))}
      >
        <Italic className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        title="Heading 1"
        disabled={disabled}
        onClick={run((v) => setHeadingLevel(v, 1, readOnlyPrefix))}
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        disabled={disabled}
        onClick={run((v) => setHeadingLevel(v, 2, readOnlyPrefix))}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        disabled={disabled}
        onClick={run((v) => setHeadingLevel(v, 3, readOnlyPrefix))}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        title="Bulleted list"
        disabled={disabled}
        onClick={run((v) => togglePrefixOnSelectedLines(v, '- ', readOnlyPrefix))}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        onClick={run((v) => togglePrefixOnSelectedLines(v, '+ ', readOnlyPrefix))}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        title="Insert image"
        disabled={disabled}
        onClick={() => setPickerOpen(true)}
      >
        <ImageIcon className="size-4" />
      </ToolbarButton>

      <ImagePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(path) => {
          if (view) insertAtCursor(view, `#image("${path}")`, readOnlyPrefix);
        }}
      />

      <div className="ml-auto">
        <a
          href={TYPST_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Typst syntax reference"
          className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <Info className="size-4" />
        </a>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ title, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

function Separator() {
  return <div className="mx-1 h-5 w-px bg-outline-variant/40" aria-hidden />;
}
