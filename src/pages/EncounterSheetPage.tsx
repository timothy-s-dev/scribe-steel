import { useState, useMemo, useCallback } from 'react';
import { Preview } from '@/components/Preview';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/useSettings';
import { Switch } from '@/components/ui/switch';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import { getAllMonsters } from '@/data/bestiary';
import type { Monster } from '@/data/types';
import encounterTyp from '@/typst/templates/encounter.typ?raw';

const TEMPLATE_FILE: VirtualFile = {
  path: '/templates/encounter.typ',
  content: encounterTyp,
};

// ── Types ────────────────────────────────────────────────────────────────────

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

interface EncounterData {
  encounter: string;
  objective: string;
  victory: string;
  failure: string;
  malice: { cost: number; name: string; description: string }[];
  groups: {
    label: string;
    creatures: {
      name: string;
      stamina: string;
      stability: number;
      speed: number;
      freeStrike: string;
      distance: string;
      notes: string;
      count?: number;
    }[];
  }[];
}

// ── ID generator ─────────────────────────────────────────────────────────────

let nextId = 1;
function id() {
  return nextId++;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

function emptyCreature(): CreatureEntry {
  return { id: id(), name: '', stamina: '', stability: 0, speed: 5, freeStrike: '', distance: 'Melee 1', notes: '', count: null };
}

function emptyGroup(): GroupEntry {
  return { id: id(), label: '', creatures: [emptyCreature()] };
}

function emptyMalice(): MaliceEntry {
  return { id: id(), cost: 3, name: '', description: '' };
}

// ── Small reusable input components ──────────────────────────────────────────

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';
const smallInputClass = 'bg-surface-container-high text-on-surface text-sm font-body px-1.5 py-1 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

// ── Main component ───────────────────────────────────────────────────────────

export function EncounterSheetPage() {
  const [encounter, setEncounter] = useState('Horde of Demons');
  const [objective, setObjective] = useState('Escape to the elevator before the Roiling Fog rises and engulfs the party.');
  const [victory, setVictory] = useState('The party reaches the elevator and ascends.');
  const [failure, setFailure] = useState('Any hero is swallowed by the advancing fog.');
  const [malice, setMalice] = useState<MaliceEntry[]>([
    { id: id(), cost: 3, name: 'Fog Surge', description: 'The fog advances an additional 3 squares toward the party.' },
    { id: id(), cost: 5, name: 'Pit Eruption', description: 'A 2x2 pit opens under a random hero. DC 12 Agility or fall prone.' },
  ]);
  const [groups, setGroups] = useState<GroupEntry[]>([
    {
      id: id(),
      label: 'Group 1 — Vanguard',
      creatures: [
        { id: id(), name: 'Muceron', stamina: '30', stability: 0, speed: 5, freeStrike: '3', distance: 'Melee 2', notes: 'Leader; retreats at 10 HP', count: null },
        { id: id(), name: 'Pitling', stamina: '3', stability: 0, speed: 5, freeStrike: '2', distance: 'Ranged 10', notes: 'Spawns each round', count: 8 },
      ],
    },
  ]);
  const { settings } = useSettings();
  const [notes, setNotes] = useState('');
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const zoom = useZoom(settings.defaultZoom);

  // Malice handlers
  const addMalice = useCallback(() => setMalice((prev) => [...prev, emptyMalice()]), []);
  const removeMalice = useCallback((mid: number) => setMalice((prev) => prev.filter((m) => m.id !== mid)), []);
  const updateMalice = useCallback((mid: number, field: keyof MaliceEntry, value: string | number) => {
    setMalice((prev) => prev.map((m) => (m.id === mid ? { ...m, [field]: value } : m)));
  }, []);

  // Group handlers
  const addGroup = useCallback(() => setGroups((prev) => [...prev, emptyGroup()]), []);
  const removeGroup = useCallback((gid: number) => setGroups((prev) => prev.filter((g) => g.id !== gid)), []);
  const updateGroupLabel = useCallback((gid: number, label: string) => {
    setGroups((prev) => prev.map((g) => (g.id === gid ? { ...g, label } : g)));
  }, []);

  // Creature handlers
  const addCreature = useCallback((gid: number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === gid ? { ...g, creatures: [...g.creatures, emptyCreature()] } : g)),
    );
  }, []);
  const removeCreature = useCallback((gid: number, cid: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid ? { ...g, creatures: g.creatures.filter((c) => c.id !== cid) } : g,
      ),
    );
  }, []);
  const updateCreature = useCallback((gid: number, cid: number, field: keyof CreatureEntry, value: string | number | null) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? { ...g, creatures: g.creatures.map((c) => (c.id === cid ? { ...c, [field]: value } : c)) }
          : g,
      ),
    );
  }, []);

  // Auto-fill creature from bestiary
  const allMonsters = useMemo(() => getAllMonsters(), []);
  const fillFromBestiary = useCallback(
    (gid: number, cid: number, monsterName: string) => {
      const m = allMonsters.find((mon) => mon.name === monsterName);
      if (!m) return;
      setGroups((prev) =>
        prev.map((g) =>
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
                        freeStrike: String(m.freeStrike),
                        distance: m.abilities[0]?.distance ?? 'Melee 1',
                        notes: c.notes,
                        count: c.count,
                      }
                    : c,
                ),
              }
            : g,
        ),
      );
    },
    [allMonsters],
  );

  // Build encounter data for JSON
  const encounterData = useMemo<EncounterData>(
    () => ({
      encounter,
      objective,
      victory,
      failure,
      malice: malice.map((m) => ({ cost: m.cost, name: m.name, description: m.description })),
      groups: groups.map((g) => ({
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
    }),
    [encounter, objective, victory, failure, malice, groups],
  );

  const source = useMemo(() => {
    const lines = [
      '#import "/templates/encounter.typ": *',
      '#let _data = json("/data/encounter.json")',
      '#show: encounter-sheet.with(',
      '  encounter: _data.encounter,',
      '  objective: _data.objective,',
      '  victory: _data.victory,',
      '  failure: _data.failure,',
      '  malice: _data.malice,',
      '  groups: _data.groups,',
      ')',
      '',
    ];
    if (notes.trim()) lines.push(notes);
    return lines.join('\n');
  }, [notes, encounterData]); // encounterData dep ensures source identity changes

  const files = useMemo<VirtualFile[]>(
    () => [
      TEMPLATE_FILE,
      { path: '/data/encounter.json', content: JSON.stringify(encounterData) },
    ],
    [encounterData],
  );

  const inputs = useMemo(
    () => ({ print: printMode ? 'true' : 'false' }),
    [printMode],
  );

  const [exporting, setExporting] = useState(false);
  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(source, files, inputs);
      if (!pdfBytes) return;
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'encounter-sheet.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left column: encounter form */}
      <div className="w-1/3 flex-shrink-0 flex flex-col overflow-hidden border-r border-outline-variant/20">
        <div className="flex items-center px-4 py-2 bg-surface-container flex-shrink-0">
          <span className="text-sm font-semibold font-body text-on-surface">
            Encounter Sheets
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-5">
          {/* Encounter Info */}
          <section className="space-y-2">
            <SectionHeader>Encounter Info</SectionHeader>
            <Field label="Name">
              <input className={inputClass} value={encounter} onChange={(e) => setEncounter(e.target.value)} />
            </Field>
            <Field label="Objective">
              <textarea className={inputClass} rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Victory">
                <textarea className={inputClass} rows={2} value={victory} onChange={(e) => setVictory(e.target.value)} />
              </Field>
              <Field label="Failure">
                <textarea className={inputClass} rows={2} value={failure} onChange={(e) => setFailure(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Malice Features */}
          <section className="space-y-2">
            <SectionHeader>Malice Features</SectionHeader>
            {malice.map((m) => (
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
                  className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0"
                  title="Remove"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ))}
            <AddButton onClick={addMalice}>Add Malice Feature</AddButton>
          </section>

          {/* Creature Groups */}
          <section className="space-y-3">
            <SectionHeader>Creature Groups</SectionHeader>
            {groups.map((g) => (
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
                    className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0"
                    title="Remove group"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {g.creatures.map((c) => (
                  <CreatureRow
                    key={c.id}
                    creature={c}
                    monsters={allMonsters}
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

          {/* Notes */}
          <section className="space-y-2">
            <SectionHeader>Notes</SectionHeader>
            <textarea
              className={inputClass}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Freeform notes (Typst markup supported)"
            />
          </section>
        </div>
      </div>

      {/* Right column: preview */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container flex-shrink-0">
          <div className="flex-1">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <Switch size="sm" checked={printMode} onCheckedChange={setPrintMode} />
              <span className="text-xs font-label text-on-surface-variant">Print-Friendly</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={zoom.zoomOut} className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Zoom out">
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <span className="text-xs font-label text-on-surface-variant w-10 text-center tabular-nums">
              {zoom.zoomPercent}%
            </span>
            <button onClick={zoom.zoomIn} className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Zoom in">
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
            <div className="w-px h-4 bg-outline-variant/30 mx-1" />
            <button
              onClick={() => zoom.setMode('fit-width')}
              className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${zoom.mode === 'fit-width' ? 'text-primary bg-surface-container-high' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Fit Width
            </button>
            <button
              onClick={() => zoom.setMode('fit-page')}
              className={`px-2 py-0.5 text-xs font-label rounded-sm transition-colors ${zoom.mode === 'fit-page' ? 'text-primary bg-surface-container-high' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Fit Page
            </button>
          </div>

          <div className="flex-1 flex justify-end">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="px-4 py-1.5 text-xs font-label font-bold tracking-wide uppercase bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-bright transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Preview content={source} template="" files={files} zoom={zoom} inputs={inputs} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
      <span className="material-symbols-outlined text-sm">add</span>
      {children}
    </button>
  );
}

function CreatureRow({
  creature,
  monsters,
  onUpdate,
  onFill,
  onRemove,
}: {
  creature: CreatureEntry;
  monsters: Monster[];
  onUpdate: (field: keyof CreatureEntry, value: string | number | null) => void;
  onFill: (name: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-1 p-2 rounded-sm bg-surface-container/50">
      {/* Row 1: name + bestiary picker + remove */}
      <div className="flex gap-1.5 items-center">
        <input
          className={`${smallInputClass} flex-1`}
          value={creature.name}
          onChange={(e) => onUpdate('name', e.target.value)}
          placeholder="Creature name"
        />
        <select
          className={`${smallInputClass} w-28 text-xs`}
          value=""
          onChange={(e) => {
            if (e.target.value) onFill(e.target.value);
          }}
        >
          <option value="">Fill from...</option>
          {monsters.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0"
          title="Remove creature"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
      {/* Row 2: stats */}
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
      {/* Row 3: notes */}
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
