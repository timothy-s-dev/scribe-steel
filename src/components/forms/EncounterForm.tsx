import { useCallback, useMemo, useState } from 'react';
import { X, Plus, Download } from 'lucide-react';
import { loadMonsterByName, type Feature, type MonsterGroup, type MonsterSummary } from '@/data/bestiary';
import { useFetchDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import type { IndexItem } from '@/data/types';
import type { EncounterDocument } from '@/documents/encounters';
import type { DocumentFormProps } from '@/documents/types';

interface MaliceEntry {
  id: number;
  cost: number;
  name: string;
  description: string;
}

interface CreatureEntry {
  id: number;
  name: string;
  stamina: string;
  stability: number;
  speed: number;
  freeStrike: string;
  distance: string;
  notes: string;
  count: number | null;
}

interface GroupEntry {
  id: number;
  label: string;
  creatures: CreatureEntry[];
}

interface EncounterFormState {
  title: string;
  objective: string;
  victory: string;
  failure: string;
  malice: MaliceEntry[];
  groups: GroupEntry[];
  content: string;
}

let nextId = 1;
function id() {
  return nextId++;
}

function emptyCreature(): CreatureEntry {
  return { id: id(), name: '', stamina: '', stability: 0, speed: 5, freeStrike: '', distance: 'Melee 1', notes: '', count: null };
}

function emptyGroup(): GroupEntry {
  return { id: id(), label: '', creatures: [emptyCreature()] };
}

function emptyMalice(): MaliceEntry {
  return { id: id(), cost: 3, name: '', description: '' };
}

function savedToFormState(saved: EncounterDocument): EncounterFormState {
  return {
    title: saved.title,
    objective: saved.objective,
    victory: saved.victory,
    failure: saved.failure,
    malice: saved.malice.map((m) => ({ id: id(), ...m })),
    groups: saved.groups.map((g) => ({
      id: id(),
      label: g.label,
      creatures: g.creatures.map((c) => ({
        id: id(),
        name: c.name,
        stamina: c.stamina,
        stability: c.stability,
        speed: c.speed,
        freeStrike: c.freeStrike,
        distance: c.distance,
        notes: c.notes,
        count: c.count ?? null,
      })),
    })),
    content: saved.content,
  };
}

function formStateToSaved(s: EncounterFormState, name: string): EncounterDocument {
  return {
    version: 1,
    name,
    title: s.title,
    objective: s.objective,
    victory: s.victory,
    failure: s.failure,
    malice: s.malice.map((m) => ({ cost: m.cost, name: m.name, description: m.description })),
    groups: s.groups.map((g) => ({
      label: g.label,
      creatures: g.creatures.map((c) => ({
        name: c.name,
        stamina: c.stamina,
        stability: c.stability,
        speed: c.speed,
        freeStrike: c.freeStrike,
        distance: c.distance,
        notes: c.notes,
        ...(c.count != null && c.count > 0 ? { count: c.count } : {}),
      })),
    })),
    content: s.content,
  };
}

function maliceFeatureToEntry(f: Feature): MaliceEntry {
  const cost = f.cost ? parseInt(f.cost, 10) || 0 : 0;
  const description = f.effects.map((e) => e.effect).filter(Boolean).join(' ');
  return { id: id(), cost, name: f.name, description };
}

function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';
const smallInputClass = 'bg-surface-container-high text-on-surface text-sm font-body px-1.5 py-1 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

export function EncounterForm({ value, onChange }: DocumentFormProps<EncounterDocument>) {
  // Form state carries per-row UI ids (used as stable React keys) that
  // don't live in the canonical document. The form initializes from
  // `value` once; subsequent external changes (e.g. resolveUseRemote) are
  // handled by the parent via a remount key.
  const [form, setForm] = useState<EncounterFormState>(() => savedToFormState(value));
  const fetchDocument = useFetchDocument();
  const { data: monsterIndex } = useIndex('monsters');
  const allGroups = useMemo(() => monsterIndex?.items ?? [], [monsterIndex?.items]);

  const updateForm = useCallback(
    (updater: (prev: EncounterFormState) => EncounterFormState) => {
      setForm((prev) => {
        const next = updater(prev);
        onChange(formStateToSaved(next, value.name));
        return next;
      });
    },
    [onChange, value.name],
  );

  const addMalice = useCallback(() => updateForm((p) => ({ ...p, malice: [...p.malice, emptyMalice()] })), [updateForm]);
  const removeMalice = useCallback((mid: number) => updateForm((p) => ({ ...p, malice: p.malice.filter((m) => m.id !== mid) })), [updateForm]);
  const updateMalice = useCallback((mid: number, field: keyof MaliceEntry, value: string | number) => {
    updateForm((p) => ({ ...p, malice: p.malice.map((m) => (m.id === mid ? { ...m, [field]: value } : m)) }));
  }, [updateForm]);

  const addGroup = useCallback(() => updateForm((p) => ({ ...p, groups: [...p.groups, emptyGroup()] })), [updateForm]);
  const removeGroup = useCallback((gid: number) => updateForm((p) => ({ ...p, groups: p.groups.filter((g) => g.id !== gid) })), [updateForm]);
  const updateGroupLabel = useCallback((gid: number, label: string) => {
    updateForm((p) => ({ ...p, groups: p.groups.map((g) => (g.id === gid ? { ...g, label } : g)) }));
  }, [updateForm]);

  const addCreature = useCallback((gid: number) => {
    updateForm((p) => ({
      ...p,
      groups: p.groups.map((g) => (g.id === gid ? { ...g, creatures: [...g.creatures, emptyCreature()] } : g)),
    }));
  }, [updateForm]);
  const removeCreature = useCallback((gid: number, cid: number) => {
    updateForm((p) => ({
      ...p,
      groups: p.groups.map((g) =>
        g.id === gid ? { ...g, creatures: g.creatures.filter((c) => c.id !== cid) } : g,
      ),
    }));
  }, [updateForm]);
  const updateCreature = useCallback((gid: number, cid: number, field: keyof CreatureEntry, value: string | number | null) => {
    updateForm((p) => ({
      ...p,
      groups: p.groups.map((g) =>
        g.id === gid
          ? { ...g, creatures: g.creatures.map((c) => (c.id === cid ? { ...c, [field]: value } : c)) }
          : g,
      ),
    }));
  }, [updateForm]);

  const fillFromBestiary = useCallback(
    async (gid: number, cid: number, monsterName: string) => {
      const m = await loadMonsterByName(monsterName);
      if (!m) return;
      const firstAbility = m.features.find((f: Feature) => f.feature_type === 'ability');
      updateForm((p) => ({
        ...p,
        groups: p.groups.map((g) =>
          g.id === gid
            ? {
                ...g,
                creatures: g.creatures.map((c) =>
                  c.id === cid
                    ? {
                        ...c,
                        name: m.name,
                        stamina: String(m.stamina),
                        stability: m.stability,
                        speed: m.speed,
                        freeStrike: String(m.free_strike),
                        distance: firstAbility?.distance ?? 'Melee 1',
                        notes: c.notes,
                        count: c.count,
                      }
                    : c,
                ),
              }
            : g,
        ),
      }));
    },
    [updateForm],
  );

  const importMaliceFromGroup = useCallback(
    async (groupName: string) => {
      const entry = allGroups.find((g) => g.name === groupName);
      if (!entry) return;
      const group = await fetchDocument<MonsterGroup>('monsters', entry.fileId);
      if (!group || group.malice.length === 0) return;
      const entries = group.malice.map(maliceFeatureToEntry);
      updateForm((p) => ({ ...p, malice: [...p.malice, ...entries] }));
    },
    [allGroups, fetchDocument, updateForm],
  );

  const groupsWithMalice = useMemo(
    () => allGroups.filter((g) => !!g.hasMalice),
    [allGroups],
  );

  return (
    <div className="flex-1 min-w-0 md:w-1/3 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-5">
        <section className="space-y-2">
          <SectionHeader>Encounter Info</SectionHeader>
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={(e) => updateForm((p) => ({ ...p, title: e.target.value }))} />
          </Field>
          <Field label="Objective">
            <textarea className={inputClass} rows={2} value={form.objective} onChange={(e) => updateForm((p) => ({ ...p, objective: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Victory">
              <textarea className={inputClass} rows={2} value={form.victory} onChange={(e) => updateForm((p) => ({ ...p, victory: e.target.value }))} />
            </Field>
            <Field label="Failure">
              <textarea className={inputClass} rows={2} value={form.failure} onChange={(e) => updateForm((p) => ({ ...p, failure: e.target.value }))} />
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeader>Malice Features</SectionHeader>
          {form.malice.map((m) => (
            <div key={m.id} className="flex gap-1.5 items-start">
              <input
                type="number"
                className={`${smallInputClass} w-12 text-center`}
                value={m.cost}
                onChange={(e) => updateMalice(m.id, 'cost', parseInt(e.target.value) || 0)}
                title="Cost"
              />
              <input
                className={`${smallInputClass} w-28`}
                value={m.name}
                onChange={(e) => updateMalice(m.id, 'name', e.target.value)}
                placeholder="Name"
              />
              <input
                className={`${smallInputClass} flex-1`}
                value={m.description}
                onChange={(e) => updateMalice(m.id, 'description', e.target.value)}
                placeholder="Description"
              />
              <button
                onClick={() => removeMalice(m.id)}
                className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Remove malice feature"
                title="Remove"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="flex gap-3 items-center">
            <AddButton onClick={addMalice}>Add Malice Feature</AddButton>
            {groupsWithMalice.length > 0 && (
              <div className="flex items-center gap-1">
                <Download size={14} className="text-primary" aria-hidden="true" />
                <select
                  className={`${smallInputClass} text-xs text-primary`}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) importMaliceFromGroup(e.target.value);
                  }}
                >
                  <option value="">Import from group...</option>
                  {groupsWithMalice.map((group) => (
                    <option key={group.name} value={group.name}>
                      {group.name}{group.custom ? ' (Custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader>Creature Groups</SectionHeader>
          {form.groups.map((g) => (
            <div key={g.id} className="space-y-2 rounded-sm bg-surface-container-low/50 p-2.5">
              <div className="flex gap-1.5 items-center">
                <input
                  className={`${inputClass} flex-1`}
                  value={g.label}
                  onChange={(e) => updateGroupLabel(g.id, e.target.value)}
                  placeholder="Group label"
                />
                <button
                  onClick={() => removeGroup(g.id)}
                  className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label="Remove group"
                  title="Remove group"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {g.creatures.map((c) => (
                <CreatureRow
                  key={c.id}
                  creature={c}
                  monsterGroups={allGroups}
                  onUpdate={(field, value) => updateCreature(g.id, c.id, field, value)}
                  onFill={(name) => fillFromBestiary(g.id, c.id, name)}
                  onRemove={() => removeCreature(g.id, c.id)}
                />
              ))}

              <AddButton onClick={() => addCreature(g.id)}>Add Creature</AddButton>
            </div>
          ))}
          <AddButton onClick={addGroup}>Add Group</AddButton>
        </section>

        <section className="space-y-2">
          <SectionHeader>Content</SectionHeader>
          <textarea
            className={inputClass}
            rows={4}
            value={form.content}
            onChange={(e) => updateForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Freeform Typst content (markup supported)"
          />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors"
    >
      <Plus size={14} aria-hidden="true" />
      {children}
    </button>
  );
}

function CreatureRow({
  creature,
  monsterGroups,
  onUpdate,
  onFill,
  onRemove,
}: {
  creature: CreatureEntry;
  monsterGroups: IndexItem[];
  onUpdate: (field: keyof CreatureEntry, value: string | number | null) => void;
  onFill: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1 p-2 rounded-sm bg-surface-container/50">
      <div className="flex gap-1.5 items-center">
        <input
          className={`${smallInputClass} flex-1`}
          value={creature.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="Creature name"
        />
        <select
          className={`${smallInputClass} w-40 text-xs`}
          value=""
          onChange={(e) => {
            if (e.target.value) onFill(e.target.value);
          }}
        >
          <option value="">Fill from...</option>
          {monsterGroups.map((group) => (
            <optgroup key={group.name} label={`${group.name}${group.custom ? ' (Custom)' : ''}`}>
              {monstersOf(group).map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} — L{m.level} {m.roles.join(', ')} (EV {m.ev ?? '-'})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Remove creature"
          title="Remove creature"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="flex gap-1 items-center flex-wrap">
        <MiniField label="Stam" width="w-14">
          <input className={`${smallInputClass} w-full text-center`} value={creature.stamina} onChange={(e) => onUpdate('stamina', e.target.value)} />
        </MiniField>
        <MiniField label="Stab" width="w-12">
          <input type="number" className={`${smallInputClass} w-full text-center`} value={creature.stability} onChange={(e) => onUpdate('stability', parseInt(e.target.value) || 0)} />
        </MiniField>
        <MiniField label="Spd" width="w-12">
          <input type="number" className={`${smallInputClass} w-full text-center`} value={creature.speed} onChange={(e) => onUpdate('speed', parseInt(e.target.value) || 0)} />
        </MiniField>
        <MiniField label="FS" width="w-12">
          <input className={`${smallInputClass} w-full text-center`} value={creature.freeStrike} onChange={(e) => onUpdate('freeStrike', e.target.value)} />
        </MiniField>
        <MiniField label="Dist" width="w-20">
          <input className={`${smallInputClass} w-full`} value={creature.distance} onChange={(e) => onUpdate('distance', e.target.value)} />
        </MiniField>
        <MiniField label="×" width="w-10">
          <input
            type="number"
            className={`${smallInputClass} w-full text-center`}
            value={creature.count ?? ''}
            onChange={(e) => onUpdate('count', e.target.value ? parseInt(e.target.value) || null : null)}
            placeholder="-"
          />
        </MiniField>
      </div>
      <input
        className={`${smallInputClass} w-full`}
        value={creature.notes}
        onChange={(e) => onUpdate('notes', e.target.value)}
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
