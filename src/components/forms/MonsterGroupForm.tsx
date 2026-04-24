import { useCallback } from 'react';
import { Copy } from 'lucide-react';
import { cloneMonster, emptyMaliceFeature, emptyMonster, loadMonsterByName } from '@/data/bestiary';
import { MonsterEditor } from '@/components/MonsterEditor';
import { AddButton, FormPanel, Input, RemoveButton, SectionHeader } from '@/components/form';
import { MonsterSelector } from '@/components/selectors/MonsterSelector';
import { useIndex } from '@/hooks/queries/useIndex';
import { removeById, updateById } from '@/lib/arrays';
import type { Feature } from '@/data/bestiary';
import type { MonsterGroupDocument } from '@/documents/monster-groups';
import type { DocumentFormProps } from '@/documents/types';

function maliceDescription(f: Feature): string {
  return f.effects.map((e) => e.effect).filter(Boolean).join(' ');
}

export function MonsterGroupForm({ value, onChange }: DocumentFormProps<MonsterGroupDocument>) {
  const { data: index } = useIndex('monsters');
  const allGroups = index?.items ?? [];

  const copyFromBestiary = useCallback(
    async (monsterName: string) => {
      const source = await loadMonsterByName(monsterName);
      if (!source) return;
      onChange({ ...value, monsters: [...value.monsters, cloneMonster(source)] });
    },
    [value, onChange],
  );

  return (
    <FormPanel bodyClassName="px-6 py-4 space-y-6 max-w-4xl">
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
        <div className="flex gap-3 items-center flex-wrap">
          <AddButton onClick={() => onChange({ ...value, monsters: [...value.monsters, emptyMonster()] })}>
            Add Monster
          </AddButton>
          <div className="flex items-center gap-1 flex-1 min-w-[16rem]">
            <Copy size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
            <MonsterSelector
              className="flex-1 min-w-0"
              groups={allGroups}
              value={null}
              onValueChange={(m) => m && copyFromBestiary(m.name)}
              placeholder="Copy from bestiary..."
            />
          </div>
        </div>
      </section>
    </FormPanel>
  );
}
