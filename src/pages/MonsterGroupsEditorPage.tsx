import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft, X, Plus, Copy } from 'lucide-react';
import { useStorage } from '@/contexts/StorageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getAllMonsterSummaries, loadMonsterByName } from '@/data/bestiary';
import { migrateMonsterGroup } from '@/data/migrate';
import { MonsterEditor, emptyMonster } from '@/components/MonsterEditor';
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

// ── Component ────────────────────────────────────────────────────────────────

export function MonsterGroupsEditorPage() {
  usePageTitle('Monster Group');
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { load, saveStatus } = useStorage();
  const { isSignedIn, isLoading: authLoading } = useAuth();
  const [doc, setDoc] = useState<SavedMonsterGroup | null>(null);
  const [docName, setDocName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maliceKeys, setMaliceKeys] = useState<number[]>([]);
  const [monsterKeys, setMonsterKeys] = useState<number[]>([]);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const { triggerSave } = useAutoSave({
    category: 'monsters',
    name: docName,
    fileId: fileId ?? null,
  });

  // Load document
  useEffect(() => {
    if (!fileId || authLoading) return;
    if (!isSignedIn) {
      setError('Sign in to load monster groups');
      setLoading(false);
      return;
    }
    setLoading(true);
    load<SavedMonsterGroup>(fileId).then((raw) => {
      if (raw) {
        const data = migrateMonsterGroup(raw);
        setDoc(data);
        setDocName(data.name);
        setMaliceKeys(data.malice.map(() => uid()));
        setMonsterKeys(data.monsters.map(() => uid()));
      } else {
        setError('Failed to load monster group');
      }
      setLoading(false);
    });
  }, [fileId, load, isSignedIn, authLoading]);

  // Get name from index cache
  useEffect(() => {
    try {
      const raw = localStorage.getItem('scribe-steel-index-monsters');
      if (raw) {
        const index = JSON.parse(raw);
        const item = index.items?.find((i: { fileId: string }) => i.fileId === fileId);
        if (item) setDocName(item.name);
      }
    } catch { /* ignore */ }
  }, [fileId]);

  const save = useCallback(
    (updated: SavedMonsterGroup) => {
      setDoc(updated);
      triggerSave(updated);
    },
    [triggerSave],
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm font-body text-on-surface-variant">Loading monster group...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-sm font-body text-tertiary">{error || 'Group not found'}</p>
        <button
          onClick={() => navigate('/monster-groups')}
          className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <button
          onClick={() => navigate('/monster-groups')}
          className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Back to list"
          title="Back to list"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <input
          className="text-sm font-body font-semibold text-on-surface bg-transparent border-none focus:outline-none flex-1"
          value={doc.name}
          onChange={(e) => {
            const updated = { ...doc, name: e.target.value };
            setDocName(e.target.value);
            save(updated);
          }}
          placeholder="Group name"
        />
        <span className="text-xs font-label text-on-surface-variant/50">
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'error'
                ? 'Save failed'
                : ''}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6 max-w-4xl">
        {/* Malice Features */}
        <section className="space-y-2">
          <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
            Malice Features
          </h3>
          {doc.malice.map((m, i) => (
            <div key={maliceKeys[i]} className="flex gap-1.5 items-start">
              <input
                className={`${smallInputClass} w-16 text-center`}
                value={maliceCostDisplay(m)}
                onChange={(e) => updateMalice(i, 'cost', e.target.value)}
                title="Cost"
                placeholder="3"
              />
              <input
                className={`${smallInputClass} w-28`}
                value={m.name}
                onChange={(e) => updateMalice(i, 'name', e.target.value)}
                placeholder="Name"
              />
              <input
                className={`${smallInputClass} flex-1`}
                value={maliceDescriptionDisplay(m)}
                onChange={(e) => updateMalice(i, 'description', e.target.value)}
                placeholder="Description"
              />
              <button
                onClick={() => removeMalice(i)}
                className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
  );
}
