import { useRef, useState } from 'react';
import { TypstEditor } from '@/components/TypstEditor';
import lorebookTyp from '@/typst/templates/lorebook.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';
import type { LoreBookDocument } from '@/documents/lore-books';

const schema: TemplateSchema = {
  name: 'Lore Book',
  importPath: '/templates/lorebook.typ',
  functionName: 'lorebook',
  params: [
    { key: 'title', label: 'Title', type: 'string' },
    { key: 'category', label: 'Category', type: 'string', optional: true },
    { key: 'epigraph', label: 'Epigraph', type: 'content', optional: true },
    {
      key: 'epigraph-attribution',
      label: 'Epigraph Attribution',
      type: 'string',
      optional: true,
    },
    { key: 'description', label: 'Description', type: 'content', optional: true },
  ],
  files: [
    { path: '/templates/lorebook.typ', content: lorebookTyp },
  ],
};

function buildSaveData(content: string, params: Record<string, string>): LoreBookDocument {
  return { version: 1, template: 'lore-books', params, body: content };
}

interface LoreBookFormProps {
  initialSaved: LoreBookDocument;
  onChange: (saved: LoreBookDocument) => void;
}

export function LoreBookForm({ initialSaved, onChange }: LoreBookFormProps) {
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
