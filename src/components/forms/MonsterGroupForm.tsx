import { useCallback, useState } from 'react';
import { Copy } from 'lucide-react';
import {
  cloneMonster,
  emptyMonster,
  getAllMonsterSummaries,
  loadMonsterByName,
} from '@/data/bestiary';
import { MonsterEditor } from '@/components/MonsterEditor';
import { AddButton, FormPanel, Input, RemoveButton, SectionHeader } from '@/components/form';
import { removeById, updateById } from '@/lib/arrays';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import type { Feature } from '@/data/bestiary';
import type { MonsterGroupDocument } from '@/documents/monster-groups';
import type { DocumentFormProps } from '@/documents/types';

function emptyMaliceFeature(): Feature {
  return {
    id: crypto.randomUUID(),
    type: 'feature',
    feature_type: 'trait',
    name: '',
    cost: '3',
    effects: [{ effect: '' }],
  };
}

function maliceDescription(f: Feature): string {
  return f.effects.map((e) => e.effect).filter(Boolean).join(' ');
}

export function MonsterGroupForm({ value, onChange }: DocumentFormProps<MonsterGroupDocument>) {
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const copyFromBestiary = useCallback(
    async (monsterName: string) => {
      const source = await loadMonsterByName(monsterName);
      if (!source) return;
      onChange({ ...value, monsters: [...value.monsters, cloneMonster(source)] });
      setCopyDialogOpen(false);
    },
    [value, onChange],
  );

  return (
    <FormPanel>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6 max-w-4xl">
        <section className="space-y-4 md:space-y-2">
          <SectionHeader>Malice Features</SectionHeader>
          {value.malice.map((m) => (
            <div key={m.id} className="space-y-1 md:space-y-0 md:flex md:gap-1.5 md:items-start">
              <div className="flex gap-1.5 items-start">
                <Input
                  inputSize="sm"
                  className="w-16 text-center"
                  value={m.cost ?? ''}
                  onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { cost: e.target.value }) })}
                  title="Cost"
                  placeholder="3"
                />
                <Input
                  inputSize="sm"
                  className="flex-1 md:w-28 md:flex-none"
                  value={m.name}
                  onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { name: e.target.value }) })}
                  placeholder="Name"
                />
                <RemoveButton
                  onClick={() => onChange({ ...value, malice: removeById(value.malice, m.id) })}
                  label="Remove malice feature"
                  className="md:hidden"
                />
              </div>
              <Input
                inputSize="sm"
                className="md:flex-1"
                value={maliceDescription(m)}
                onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { effects: [{ effect: e.target.value }] }) })}
                placeholder="Description"
              />
              <RemoveButton
                onClick={() => onChange({ ...value, malice: removeById(value.malice, m.id) })}
                label="Remove malice feature"
                className="hidden md:block"
              />
            </div>
          ))}
          <AddButton onClick={() => onChange({ ...value, malice: [...value.malice, emptyMaliceFeature()] })}>
            Add Malice Feature
          </AddButton>
        </section>

        <section className="space-y-3">
          <SectionHeader>Monsters</SectionHeader>
          {value.monsters.map((monster) => (
            <MonsterEditor
              key={monster.id}
              monster={monster}
              onChange={(m) => onChange({ ...value, monsters: updateById(value.monsters, monster.id, m) })}
              onRemove={() => onChange({ ...value, monsters: removeById(value.monsters, monster.id) })}
            />
          ))}
          <div className="flex gap-3">
            <AddButton onClick={() => onChange({ ...value, monsters: [...value.monsters, emptyMonster()] })}>
              Add Monster
            </AddButton>
            <AddButton onClick={() => setCopyDialogOpen(true)} icon={Copy}>
              Copy from Bestiary
            </AddButton>
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
    </FormPanel>
  );
}
