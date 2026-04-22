import { useCallback, useState } from 'react';
import { X, Plus, Copy } from 'lucide-react';
import { getAllMonsterSummaries, loadMonsterByName } from '@/data/bestiary';
import { useEmitOnChange } from '@/hooks/useEmitOnChange';
import { MonsterEditor, emptyMonster } from '@/components/MonsterEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Monster, Feature } from '@/data/types';
import type { MonsterGroupDocument } from '@/documents/monster-groups';

const smallInputClass = 'bg-surface-container-high text-on-surface text-sm font-body px-1.5 py-1 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

let _nextId = 1;
function uid() {
  return _nextId++;
}

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

interface MonsterGroupFormProps {
  initialSaved: MonsterGroupDocument;
  onChange: (saved: MonsterGroupDocument) => void;
}

export function MonsterGroupForm({ initialSaved, onChange }: MonsterGroupFormProps) {
  const [saved, setSaved] = useState<MonsterGroupDocument>(initialSaved);
  const [maliceKeys, setMaliceKeys] = useState<number[]>(() => initialSaved.malice.map(() => uid()));
  const [monsterKeys, setMonsterKeys] = useState<number[]>(() => initialSaved.monsters.map(() => uid()));
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  useEmitOnChange(saved, onChange);

  const addMalice = useCallback(() => {
    setSaved((prev) => ({ ...prev, malice: [...prev.malice, emptyMaliceFeature()] }));
    setMaliceKeys((prev) => [...prev, uid()]);
  }, []);

  const updateMalice = useCallback((index: number, field: string, value: string) => {
    setSaved((prev) => ({
      ...prev,
      malice: prev.malice.map((m, i) => {
        if (i !== index) return m;
        if (field === 'cost') return { ...m, cost: value };
        if (field === 'name') return { ...m, name: value };
        if (field === 'description') return { ...m, effects: [{ effect: value }] };
        return m;
      }),
    }));
  }, []);

  const removeMalice = useCallback((index: number) => {
    setSaved((prev) => ({ ...prev, malice: prev.malice.filter((_, i) => i !== index) }));
    setMaliceKeys((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addMonster = useCallback(() => {
    setSaved((prev) => ({ ...prev, monsters: [...prev.monsters, emptyMonster()] }));
    setMonsterKeys((prev) => [...prev, uid()]);
  }, []);

  const updateMonster = useCallback((index: number, monster: Monster) => {
    setSaved((prev) => ({
      ...prev,
      monsters: prev.monsters.map((m, i) => (i === index ? monster : m)),
    }));
  }, []);

  const removeMonster = useCallback((index: number) => {
    setSaved((prev) => ({ ...prev, monsters: prev.monsters.filter((_, i) => i !== index) }));
    setMonsterKeys((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const copyFromBestiary = useCallback(async (monsterName: string) => {
    const source = await loadMonsterByName(monsterName);
    if (!source) return;
    const copy = structuredClone(source);
    setSaved((prev) => ({ ...prev, monsters: [...prev.monsters, copy] }));
    setMonsterKeys((prev) => [...prev, uid()]);
    setCopyDialogOpen(false);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6 max-w-4xl">
        <section className="space-y-4 md:space-y-2">
          <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
            Malice Features
          </h3>
          {saved.malice.map((m, i) => (
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

        <section className="space-y-3">
          <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
            Monsters
          </h3>
          {saved.monsters.map((monster, i) => (
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
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
