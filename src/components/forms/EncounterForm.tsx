import { useCallback, useMemo } from 'react';
import { Download } from 'lucide-react';
import { loadMonsterByName, type Feature, type MonsterGroup } from '@/data/bestiary';
import { useFetchDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import {
  AddButton,
  Field,
  FormPanel,
  Input,
  RemoveButton,
  SectionHeader,
  Textarea,
} from '@/components/form';
import { MonsterGroupSelector } from '@/components/selectors/MonsterGroupSelector';
import { MonsterSelector } from '@/components/selectors/MonsterSelector';
import { removeById, updateById } from '@/lib/arrays';
import type { IndexItem } from '@/data/types';
import {
  emptyCreature,
  emptyGroup,
  emptyMalice,
  type EncounterCreature,
  type EncounterDocument,
  type EncounterMalice,
} from '@/documents/encounters';
import type { DocumentFormProps } from '@/documents/types';

function maliceFromFeature(f: Feature): EncounterMalice {
  return {
    id: crypto.randomUUID(),
    cost: f.cost ? parseInt(f.cost, 10) || 0 : 0,
    name: f.name,
    description: f.effects.map((e) => e.effect).filter(Boolean).join(' '),
  };
}

export function EncounterForm({ value, onChange }: DocumentFormProps<EncounterDocument>) {
  const fetchDocument = useFetchDocument();
  const { data: monsterIndex } = useIndex('monsters');
  const allGroups = useMemo(() => monsterIndex?.items ?? [], [monsterIndex?.items]);

  const groupsWithMalice = useMemo(
    () => allGroups.filter((g) => !!g.hasMalice),
    [allGroups],
  );

  const updateCreature = useCallback(
    (gid: string, cid: string, patch: Partial<EncounterCreature>) => {
      onChange({
        ...value,
        groups: updateById(value.groups, gid, (g) => ({
          ...g,
          creatures: updateById(g.creatures, cid, patch),
        })),
      });
    },
    [value, onChange],
  );

  const fillFromBestiary = useCallback(
    async (gid: string, cid: string, monsterName: string) => {
      const m = await loadMonsterByName(monsterName);
      if (!m) return;
      const firstAbility = m.features.find((f: Feature) => f.feature_type === 'ability');
      updateCreature(gid, cid, {
        name: m.name,
        stamina: String(m.stamina),
        stability: m.stability,
        speed: m.speed,
        freeStrike: String(m.free_strike),
        distance: firstAbility?.distance ?? 'Melee 1',
      });
    },
    [updateCreature],
  );

  const importMaliceFromGroup = useCallback(
    async (entry: IndexItem) => {
      const group = await fetchDocument<MonsterGroup>('monsters', entry.fileId);
      if (!group || group.malice.length === 0) return;
      onChange({ ...value, malice: [...value.malice, ...group.malice.map(maliceFromFeature)] });
    },
    [fetchDocument, onChange, value],
  );

  return (
    <FormPanel className="md:w-1/3" bodyClassName="space-y-5">
        <section className="space-y-2">
          <SectionHeader>Encounter Info</SectionHeader>
          <Field label="Title" required>
            <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
          </Field>
          <Field label="Objective">
            <Textarea rows={2} value={value.objective} onChange={(e) => onChange({ ...value, objective: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Victory">
              <Textarea rows={2} value={value.victory} onChange={(e) => onChange({ ...value, victory: e.target.value })} />
            </Field>
            <Field label="Failure">
              <Textarea rows={2} value={value.failure} onChange={(e) => onChange({ ...value, failure: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeader>Malice Features</SectionHeader>
          {value.malice.map((m) => (
            <div key={m.id} className="flex gap-1.5 items-start">
              <Input
                inputSize="sm"
                type="number"
                className="w-12 text-center"
                value={m.cost}
                onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { cost: parseInt(e.target.value) || 0 }) })}
                title="Cost"
              />
              <Input
                inputSize="sm"
                className="w-28"
                value={m.name}
                onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { name: e.target.value }) })}
                placeholder="Name"
              />
              <Input
                inputSize="sm"
                className="flex-1"
                value={m.description}
                onChange={(e) => onChange({ ...value, malice: updateById(value.malice, m.id, { description: e.target.value }) })}
                placeholder="Description"
              />
              <RemoveButton
                onClick={() => onChange({ ...value, malice: removeById(value.malice, m.id) })}
                label="Remove malice feature"
              />
            </div>
          ))}
          <div className="flex gap-3 items-center">
            <AddButton onClick={() => onChange({ ...value, malice: [...value.malice, emptyMalice()] })}>
              Add Malice Feature
            </AddButton>
            {groupsWithMalice.length > 0 && (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Download size={14} className="text-primary flex-shrink-0" aria-hidden="true" />
                <MonsterGroupSelector
                  className="flex-1 min-w-0"
                  groups={groupsWithMalice}
                  value={null}
                  onValueChange={(g) => g && importMaliceFromGroup(g)}
                  placeholder="Import from group..."
                />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader>Creature Groups</SectionHeader>
          {value.groups.map((g) => (
            <div key={g.id} className="space-y-2 rounded-sm bg-surface-container-low/50 p-2.5">
              <div className="flex gap-1.5 items-center">
                <Input
                  className="flex-1"
                  value={g.label}
                  onChange={(e) => onChange({ ...value, groups: updateById(value.groups, g.id, { label: e.target.value }) })}
                  placeholder="Group label"
                />
                <RemoveButton
                  onClick={() => onChange({ ...value, groups: removeById(value.groups, g.id) })}
                  label="Remove group"
                />
              </div>

              {g.creatures.map((c) => (
                <CreatureRow
                  key={c.id}
                  creature={c}
                  monsterGroups={allGroups}
                  onUpdate={(patch) => updateCreature(g.id, c.id, patch)}
                  onFill={(name) => fillFromBestiary(g.id, c.id, name)}
                  onRemove={() => onChange({
                    ...value,
                    groups: updateById(value.groups, g.id, (gr) => ({ ...gr, creatures: removeById(gr.creatures, c.id) })),
                  })}
                />
              ))}

              <AddButton
                onClick={() => onChange({
                  ...value,
                  groups: updateById(value.groups, g.id, (gr) => ({ ...gr, creatures: [...gr.creatures, emptyCreature()] })),
                })}
              >
                Add Creature
              </AddButton>
            </div>
          ))}
          <AddButton onClick={() => onChange({ ...value, groups: [...value.groups, emptyGroup()] })}>
            Add Group
          </AddButton>
        </section>

        <section className="space-y-2">
          <SectionHeader>Content</SectionHeader>
          <Textarea
            rows={4}
            value={value.content}
            onChange={(e) => onChange({ ...value, content: e.target.value })}
            placeholder="Freeform Typst content (markup supported)"
          />
        </section>
    </FormPanel>
  );
}

function CreatureRow({
  creature,
  monsterGroups,
  onUpdate,
  onFill,
  onRemove,
}: {
  creature: EncounterCreature;
  monsterGroups: IndexItem[];
  onUpdate: (patch: Partial<EncounterCreature>) => void;
  onFill: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1 p-2 rounded-sm bg-surface-container/50">
      <div className="flex gap-1.5 items-center">
        <Input
          inputSize="sm"
          className="flex-1"
          value={creature.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Creature name"
        />
        <MonsterSelector
          className="w-40"
          groups={monsterGroups}
          value={null}
          onValueChange={(m) => m && onFill(m.name)}
          placeholder="Fill from..."
        />
        <RemoveButton onClick={onRemove} label="Remove creature" compact />
      </div>
      <div className="flex gap-1 items-center flex-wrap">
        <MiniField label="Stam" width="w-14">
          <Input inputSize="sm" className="text-center" value={creature.stamina} onChange={(e) => onUpdate({ stamina: e.target.value })} />
        </MiniField>
        <MiniField label="Stab" width="w-12">
          <Input inputSize="sm" type="number" className="text-center" value={creature.stability} onChange={(e) => onUpdate({ stability: parseInt(e.target.value) || 0 })} />
        </MiniField>
        <MiniField label="Spd" width="w-12">
          <Input inputSize="sm" type="number" className="text-center" value={creature.speed} onChange={(e) => onUpdate({ speed: parseInt(e.target.value) || 0 })} />
        </MiniField>
        <MiniField label="FS" width="w-12">
          <Input inputSize="sm" className="text-center" value={creature.freeStrike} onChange={(e) => onUpdate({ freeStrike: e.target.value })} />
        </MiniField>
        <MiniField label="Dist" width="w-20">
          <Input inputSize="sm" value={creature.distance} onChange={(e) => onUpdate({ distance: e.target.value })} />
        </MiniField>
        <MiniField label="×" width="w-10">
          <Input
            inputSize="sm"
            type="number"
            className="text-center"
            value={creature.count ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value);
              onUpdate({ count: Number.isFinite(n) && n > 0 ? n : undefined });
            }}
            placeholder="-"
          />
        </MiniField>
      </div>
      <Input
        inputSize="sm"
        value={creature.notes}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        placeholder="Notes"
      />
    </div>
  );
}

function MiniField({ label, width, children }: { label: string; width: string; children: React.ReactNode }) {
  return (
    <div className={width}>
      <div className="text-[10px] font-label text-on-surface-variant/70 text-center">{label}</div>
      {children}
    </div>
  );
}
