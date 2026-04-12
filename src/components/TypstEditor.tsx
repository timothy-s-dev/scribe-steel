import { useState } from 'react';
import { Editor } from './Editor';
import { Preview } from './Preview';
import { Toolbar } from './Toolbar';

interface TypstEditorProps {
  template: string;
  initialContent?: string;
}

export function TypstEditor({ template, initialContent = '' }: TypstEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="app">
      <Toolbar content={content} template={template} />
      <div className="panels">
        <div className="editor-panel">
          <Editor value={content} onChange={setContent} />
        </div>
        <div className="preview-panel">
          <Preview content={content} template={template} />
        </div>
      </div>
    </div>
  );
}
