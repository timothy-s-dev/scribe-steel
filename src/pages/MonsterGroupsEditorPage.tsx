import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { X, Plus, Copy } from 'lucide-react';
import { useDocument } from '@/hooks/queries/useDocument';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { getAllMonsterSummaries, loadMonsterByName } from '@/data/bestiary';
import { MonsterEditor, emptyMonster } from '@/components/MonsterEditor';
import { EditorPageShell } from '@/components/EditorPageShell';
import { ConflictDialog } from '@/components/ConflictDialog';
import type { SavedMonsterGroup, Monster, Feature } from '@/data/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ── Shared styles ────────────────────────────────────────────────────────────

const smallInputClass = 'bg-surface-container-high text-on-surface text-sm font-body px-1.5 py-1 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

// ── ID helper ────────────────────────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return _nextId++;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function maliceCostDisplay(f: Feature): string {
  return f.cost ?? '';
}

function maliceDescriptionDisplay(f: Feature): string {
  return f.effects.map((e) => e.effect).filter(Boolean).join(' ');
}

function emptyMaliceFeature(): Feature {
  return {
    type: 'feature',
    feature_type: 'trait',
    name: '',
    cost: '3',
    effects: [{ effect: '' }],
  };
}

function stripMetadata(saved: SavedMonsterGroup): Omit<SavedMonsterGroup, 'updatedAt'> {
  const { updatedAt: _ignored, ...rest } = saved;
  return rest;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MonsterGroupsEditorPage() {
  usePageTitle('Monster Group');
  const { fileId } = useParams<{ fileId: string }>();
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<SavedMonsterGroup>('monsters', fileId);
  const [doc, setDoc] = useState<SavedMonsterGroup | null>(null);
  const [maliceKeys, setMaliceKeys] = useState<number[]>([]);
  const [monsterKeys, setMonsterKeys] = useState<number[]>([]);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const error = loadError ? 'Failed to load monster group' : null;

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'monsters',
    name: doc?.name ?? '',
    fileId: fileId ?? null,
    deriveIndexFields: (data) => {
      const group = data as SavedMonsterGroup;
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

  const sync = useDocumentSync<SavedMonsterGroup>({
    loaded,
    initialize: (saved) => {
      setDoc(saved);
      setMaliceKeys(saved.malice.map(() => uid()));
      setMonsterKeys(saved.monsters.map(() => uid()));
    },
    isEqualToLocal: (saved) => {
      if (!doc) return false;
      return JSON.stringify(stripMetadata(saved)) === JSON.stringify(stripMetadata(doc));
    },
    getUpdatedAt: (saved) => saved.updatedAt,
  });

  const save = useCallback(
    (updated: SavedMonsterGroup) => {
      setDoc(updated);
      if (sync.conflict) return;
      triggerSave(updated);
    },
    [triggerSave, sync.conflict],
  );

  // ── Malice handlers ────────────────────────────────────────────────────────

  const addMalice = useCallback(() => {
    if (!doc) return;
    const updated = { ...doc, malice: [...doc.malice, emptyMaliceFeature()] };
    setMaliceKeys((prev) => [...prev, uid()]);
    save(updated);
  }, [doc, save]);

  const updateMalice = useCallback(
    (index: number, field: string, value: string) => {
      if (!doc) return;
      const malice = doc.malice.map((m, i) => {
        if (i !== index) return m;
        if (field === 'cost') return { ...m, cost: value };
        if (field === 'name') return { ...m, name: value };
        if (field === 'description') return { ...m, effects: [{ effect: value }] };
        return m;
      });
      save({ ...doc, malice });
    },
    [doc, save],
  );

  const removeMalice = useCallback(
    (index: number) => {
      if (!doc) return;
      save({ ...doc, malice: doc.malice.filter((_, i) => i !== index) });
      setMaliceKeys((prev) => prev.filter((_, i) => i !== index));
    },
    [doc, save],
  );

  // ── Monster handlers ───────────────────────────────────────────────────────

  const addMonster = useCallback(() => {
    if (!doc) return;
    const updated = { ...doc, monsters: [...doc.monsters, emptyMonster()] };
    setMonsterKeys((prev) => [...prev, uid()]);
    save(updated);
  }, [doc, save]);

  const updateMonster = useCallback(
    (index: number, monster: Monster) => {
      if (!doc) return;
      const monsters = doc.monsters.map((m, i) => (i === index ? monster : m));
      save({ ...doc, monsters });
    },
    [doc, save],
  );

  const removeMonster = useCallback(
    (index: number) => {
      if (!doc) return;
      save({ ...doc, monsters: doc.monsters.filter((_, i) => i !== index) });
      setMonsterKeys((prev) => prev.filter((_, i) => i !== index));
    },
    [doc, save],
  );

  const copyFromBestiary = useCallback(
    async (monsterName: string) => {
      if (!doc) return;
      const source = await loadMonsterByName(monsterName);
      if (!source) return;
      const copy = structuredClone(source);
      const updated = { ...doc, monsters: [...doc.monsters, copy] };
      setMonsterKeys((prev) => [...prev, uid()]);
      save(updated);
      setCopyDialogOpen(false);
    },
    [doc, save],
  );

  const handleKeepLocal = useCallback(() => {
    if (!doc) return;
    sync.dismissConflict();
    triggerSave(doc);
    void flush();
  }, [sync, triggerSave, flush, doc]);

  const title = doc ? (
    <input
      className="w-full text-sm font-body font-semibold text-on-surface bg-transparent border-none focus:outline-none"
      value={doc.name}
      onChange={(e) => save({ ...doc, name: e.target.value })}
      placeholder="Group name"
    />
  ) : (
    ''
  );

  return (
    <EditorPageShell
      loading={loading}
      error={error || (!loaded && !loading ? 'Group not found' : null)}
      backTo="/monster-groups"
      title={title}
      saveStatus={saveStatus}
    >
      {doc && (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6 max-w-4xl">
            {/* Malice Features */}
            <section className="space-y-4 md:space-y-2">
              <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
                Malice Features
              </h3>
              {doc.malice.map((m, i) => (
                <div key={maliceKeys[i]} className="space-y-1 md:space-y-0 md:flex md:gap-1.5 md:items-start">
                  <div className="flex gap-1.5 items-start">
                    <input
                      className={`${smallInputClass} w-16 text-center`}
                      value={maliceCostDisplay(m)}
                      onChange={(e) => updateMalice(i, 'cost', e.target.value)}
                      title="Cost"
                      placeholder="3"
                    />
                    <input
                      className={`${smallInputClass} flex-1 md:w-28 md:flex-none`}
                      value={m.name}
                      onChange={(e) => updateMalice(i, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <button
                      onClick={() => removeMalice(i)}
                      className="md:hidden p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      aria-label="Remove malice feature"
                      title="Remove"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <input
                    className={`${smallInputClass} w-full md:flex-1`}
                    value={maliceDescriptionDisplay(m)}
                    onChange={(e) => updateMalice(i, 'description', e.target.value)}
                    placeholder="Description"
                  />
                  <button
                    onClick={() => removeMalice(i)}
                    className="hidden md:block p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label="Remove malice feature"
                    title="Remove"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                onClick={addMalice}
                className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                <Plus size={14} aria-hidden="true" />
                Add Malice Feature
              </button>
            </section>

            {/* Monsters */}
            <section className="space-y-3">
              <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
                Monsters
              </h3>
              {doc.monsters.map((monster, i) => (
                <MonsterEditor
                  key={monsterKeys[i]}
                  monster={monster}
                  onChange={(m) => updateMonster(i, m)}
                  onRemove={() => removeMonster(i)}
                />
              ))}
              <div className="flex gap-3">
                <button
                  onClick={addMonster}
                  className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  <Plus size={14} aria-hidden="true" />
                  Add Monster
                </button>
                <button
                  onClick={() => setCopyDialogOpen(true)}
                  className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  <Copy size={14} aria-hidden="true" />
                  Copy from Bestiary
                </button>
              </div>
            </section>
          </div>

          {/* Copy from Bestiary dialog */}
          <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Copy from Bestiary</DialogTitle>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {getAllMonsterSummaries().map((m) => (
                  <button
                    key={m.name}
                    onClick={() => copyFromBestiary(m.name)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-sm hover:bg-surface-container-high transition-colors text-left cursor-pointer"
                  >
                    <span className="text-sm font-body font-semibold text-on-surface">
                      {m.name}
                    </span>
                    <span className="text-xs font-label text-on-surface-variant">
                      L{m.level} {m.roles.join(', ')} · EV {m.ev ?? '-'}
                    </span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <DialogClose>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
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
