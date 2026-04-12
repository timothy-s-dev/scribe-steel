import { useState } from 'react';
import { Editor } from '@/components/Editor';
import { Preview } from '@/components/Preview';
import { Toolbar } from '@/components/Toolbar';

interface TypstEditorProps {
  template: string;
  initialContent?: string;
}

export function TypstEditor({ template, initialContent = '' }: TypstEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar content={content} template={template} />
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 min-w-0 overflow-hidden border-r">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="flex-1 min-w-0 overflow-auto bg-muted/30 p-4">
          <Preview content={content} template={template} />
        </div>
      </div>
    </div>
  );
}
