import { useRef, useState } from 'react';
import { TypstEditor } from '@/components/TypstEditor';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';
import type { HandwrittenDocument } from '@/documents/handwritten';

const schema: TemplateSchema = {
  name: 'Handwritten Note',
  importPath: '/templates/handwritten.typ',
  functionName: 'handwritten',
  params: [
    { key: 'title', label: 'Title', type: 'string', optional: true },
  ],
  files: [
    { path: '/templates/handwritten.typ', content: handwrittenTyp },
  ],
};

function buildSaveData(content: string, params: Record<string, string>): HandwrittenDocument {
  return { version: 1, template: 'handwritten', params, body: content };
}

interface HandwrittenFormProps {
  initialSaved: HandwrittenDocument;
  onChange: (saved: HandwrittenDocument) => void;
}

export function HandwrittenForm({ initialSaved, onChange }: HandwrittenFormProps) {
  const [content, setContent] = useState(initialSaved.body);
  const [params, setParams] = useState<Record<string, string>>(initialSaved.params);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleContentChange = (next: string) => {
    setContent(next);
    onChangeRef.current(buildSaveData(next, params));
  };

  const handleParamsChange = (next: Record<string, string>) => {
    setParams(next);
    onChangeRef.current(buildSaveData(content, next));
  };

  return (
    <TypstEditor
      schema={schema}
      content={content}
      params={params}
      onContentChange={handleContentChange}
      onParamsChange={handleParamsChange}
    />
  );
}
