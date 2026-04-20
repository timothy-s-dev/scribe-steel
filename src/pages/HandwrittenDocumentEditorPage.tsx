import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPage } from '@/components/EditorPage';
import { HandwrittenForm } from '@/components/forms/HandwrittenForm';
import { handwrittenMetadata, type HandwrittenDocument } from '@/documents/handwritten';

export function HandwrittenDocumentEditorPage() {
  usePageTitle('Handwritten Document');
  const { fileId } = useParams<{ fileId: string }>();
  const isNew = fileId === 'demo';
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<HandwrittenDocument>(
    'handwritten',
    isNew ? undefined : fileId,
    { enabled: !isNew },
  );
  const error = loadError ? 'Failed to load document' : null;

  const [saved, setSaved] = useState<HandwrittenDocument | null>(() =>
    isNew ? handwrittenMetadata.createDefault('') : null,
  );
  const [resetKey, setResetKey] = useState(0);

  const { data: index } = useIndex('handwritten');
  const docName = isNew
    ? 'Untitled'
    : (index?.items.find((i) => i.fileId === fileId)?.name ?? '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'handwritten',
    name: docName,
    fileId: isNew ? null : (fileId ?? null),
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<HandwrittenDocument>({
    loaded: isNew ? undefined : loaded,
    currentLocal: saved,
    initialize: (next) => {
      setSaved(next);
      setResetKey((k) => k + 1);
    },
    isEqualToLocal: (next) => {
      if (!saved) return false;
      const { updatedAt: _n, ...nextRest } = next;
      const { updatedAt: _s, ...savedRest } = saved;
      return JSON.stringify(nextRest) === JSON.stringify(savedRest);
    },
    getUpdatedAt: (s) => s.updatedAt,
    triggerSave,
    flush,
  });

  const handleChange = (next: HandwrittenDocument) => {
    setSaved(next);
    if (sync.conflict) return;
    triggerSave(next);
  };

  return (
    <EditorPage
      loading={loading}
      error={error}
      metadata={handwrittenMetadata}
      title={docName}
      saveStatus={saveStatus}
      sync={sync}
    >
      {saved && (
        <HandwrittenForm key={resetKey} initialSaved={saved} onChange={handleChange} />
      )}
    </EditorPage>
  );
}
