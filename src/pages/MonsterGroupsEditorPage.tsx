import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDocument } from '@/hooks/queries/useDocument';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPage } from '@/components/EditorPage';
import { MonsterGroupForm } from '@/components/forms/MonsterGroupForm';
import { monsterGroupsMetadata, type MonsterGroupDocument } from '@/documents/monster-groups';

function stripMetadata(doc: MonsterGroupDocument): Omit<MonsterGroupDocument, 'updatedAt'> {
  const { updatedAt: _ignored, ...rest } = doc;
  return rest;
}

export function MonsterGroupsEditorPage() {
  usePageTitle('Monster Group');
  const { fileId } = useParams<{ fileId: string }>();
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<MonsterGroupDocument>('monsters', fileId);
  const [saved, setSaved] = useState<MonsterGroupDocument | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const error = loadError ? 'Failed to load monster group' : null;

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'monsters',
    name: saved?.name ?? '',
    fileId: fileId ?? null,
    deriveIndexFields: (data) => {
      const group = data as MonsterGroupDocument;
      return {
        hasMalice: group.malice.length > 0,
        monsters: group.monsters.map((m) => ({
          name: m.name,
          level: m.level,
          roles: m.roles,
          ev: m.ev,
        })),
      };
    },
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<MonsterGroupDocument>({
    loaded,
    currentLocal: saved,
    initialize: (next) => {
      setSaved(next);
      setResetKey((k) => k + 1);
    },
    isEqualToLocal: (next) => {
      if (!saved) return false;
      return JSON.stringify(stripMetadata(next)) === JSON.stringify(stripMetadata(saved));
    },
    getUpdatedAt: (s) => s.updatedAt,
    triggerSave,
    flush,
  });

  const handleChange = useCallback(
    (next: MonsterGroupDocument) => {
      setSaved(next);
      if (sync.conflict) return;
      triggerSave(next);
    },
    [triggerSave, sync.conflict],
  );

  return (
    <EditorPage
      loading={loading}
      error={error || (!loaded && !loading ? 'Group not found' : null)}
      metadata={monsterGroupsMetadata}
      title={saved?.name || ''}
      saveStatus={saveStatus}
      sync={sync}
    >
      {saved && (
        <MonsterGroupForm key={resetKey} initialSaved={saved} onChange={handleChange} />
      )}
    </EditorPage>
  );
}
