import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPage } from '@/components/EditorPage';
import { LoreBookForm } from '@/components/forms/LoreBookForm';
import { loreBooksMetadata, type LoreBookDocument } from '@/documents/lore-books';

export function LoreBooksEditorPage() {
  usePageTitle('Lore Book');
  const { fileId } = useParams<{ fileId: string }>();
  const isNew = fileId === 'demo';
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<LoreBookDocument>(
    'lore-books',
    isNew ? undefined : fileId,
    { enabled: !isNew },
  );
  const error = loadError ? 'Failed to load document' : null;

  const [saved, setSaved] = useState<LoreBookDocument | null>(() =>
    isNew ? loreBooksMetadata.createDefault('') : null,
  );
  const [resetKey, setResetKey] = useState(0);

  const { data: index } = useIndex('lore-books');
  const docName = isNew
    ? 'Untitled'
    : (index?.items.find((i) => i.fileId === fileId)?.name ?? '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'lore-books',
    name: docName,
    fileId: isNew ? null : (fileId ?? null),
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<LoreBookDocument>({
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

  const handleChange = (next: LoreBookDocument) => {
    setSaved(next);
    if (sync.conflict) return;
    triggerSave(next);
  };

  return (
    <EditorPage
      loading={loading}
      error={error}
      metadata={loreBooksMetadata}
      title={docName}
      saveStatus={saveStatus}
      sync={sync}
    >
      {saved && (
        <LoreBookForm key={resetKey} initialSaved={saved} onChange={handleChange} />
      )}
    </EditorPage>
  );
}
