import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TypstEditor } from '@/components/TypstEditor';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPageShell } from '@/components/EditorPageShell';
import { PenTool } from 'lucide-react';
import { ConflictDialog } from '@/components/ConflictDialog';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';
import type { SavedDocMetadata } from '@/data/types';

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

interface SavedDocument extends SavedDocMetadata {
  version: number;
  template: string;
  params: Record<string, string>;
  body: string;
}

function buildSaveData(content: string, params: Record<string, string>): SavedDocument {
  return { version: 1, template: 'letters-and-notes', params, body: content };
}

export function LettersAndNotesEditorPage() {
  usePageTitle('Letter / Note');
  const { fileId } = useParams<{ fileId: string }>();
  const isNew = fileId === 'demo';
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<SavedDocument>(
    'letters-and-notes',
    isNew ? undefined : fileId,
    { enabled: !isNew },
  );
  const error = loadError ? 'Failed to load document' : null;

  const [content, setContent] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});

  const { data: index } = useIndex('letters-and-notes');
  const docName = isNew
    ? 'Untitled'
    : (index?.items.find((i) => i.fileId === fileId)?.name ?? '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'letters-and-notes',
    name: docName,
    fileId: isNew ? null : (fileId ?? null),
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<SavedDocument>({
    loaded: isNew ? undefined : loaded,
    initialize: (saved) => {
      setContent(saved.body);
      setParams(saved.params);
    },
    isEqualToLocal: (saved) => {
      const { updatedAt: _ignored, ...rest } = saved;
      return JSON.stringify(rest) === JSON.stringify(buildSaveData(content, params));
    },
    getUpdatedAt: (saved) => saved.updatedAt,
  });

  const handleContentChange = (next: string) => {
    setContent(next);
    if (sync.conflict) return;
    triggerSave(buildSaveData(next, params));
  };

  const handleParamsChange = (next: Record<string, string>) => {
    setParams(next);
    if (sync.conflict) return;
    triggerSave(buildSaveData(content, next));
  };

  const handleKeepLocal = useCallback(() => {
    sync.dismissConflict();
    triggerSave(buildSaveData(content, params));
    void flush();
  }, [sync, triggerSave, flush, content, params]);

  return (
    <EditorPageShell
      loading={loading}
      error={error}
      backTo="/letters-and-notes"
      parentIcon={PenTool}
      parentTitle="Letters and Notes"
      title={docName}
      saveStatus={saveStatus}
    >
      <TypstEditor
        schema={schema}
        content={content}
        params={params}
        onContentChange={handleContentChange}
        onParamsChange={handleParamsChange}
      />
      <ConflictDialog
        open={!!sync.conflict}
        localUpdatedAt={sync.conflict?.local}
        remoteUpdatedAt={sync.conflict?.remote}
        onUseRemote={sync.useRemote}
        onKeepLocal={handleKeepLocal}
      />
    </EditorPageShell>
  );
}
