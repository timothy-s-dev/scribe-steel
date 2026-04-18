import { useState, useMemo, useCallback } from 'react';

type MobileTab = 'edit' | 'preview';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { X, Plus, Download, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { Preview } from '@/components/Preview';
import { PreviewToolbar } from '@/components/PreviewToolbar';
import { useZoom } from '@/hooks/useZoom';
import { useSettings } from '@/hooks/queries/useSettings';
import { loadMonsterByName, type MonsterSummary } from '@/data/bestiary';
import { useDocument, useFetchDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { EditorPageShell } from '@/components/EditorPageShell';
import { ConflictDialog } from '@/components/ConflictDialog';
import { compilePdf, type VirtualFile } from '@/typst/compiler';
import type { Feature, MonsterGroup, IndexItem, SavedEncounter } from '@/data/types';
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

function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

// ── Helpers to convert between saved and form state ─────────────────────────

function savedToFormState(saved: SavedEncounter) {
  return {
    encounter: saved.encounter,
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
    notes: saved.notes,
  };
}

function maliceFeatureToEntry(f: Feature): MaliceEntry {
  const cost = f.cost ? parseInt(f.cost, 10) || 0 : 0;
  const description = f.effects.map((e) => e.effect).filter(Boolean).join(' ');
  return { id: id(), cost, name: f.name, description };
}

interface EncounterFormState {
  encounter: string;
  objective: string;
  victory: string;
  failure: string;
  malice: MaliceEntry[];
  groups: GroupEntry[];
  notes: string;
}

function formStateToSaved(s: EncounterFormState): SavedEncounter {
  return {
    version: 1,
    encounter: s.encounter,
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
    notes: s.notes,
  };
}

function emptyFormState(): EncounterFormState {
  return {
    encounter: '',
    objective: '',
    victory: '',
    failure: '',
    malice: [],
    groups: [],
    notes: '',
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export function EncounterSheetEditorPage() {
  usePageTitle('Encounter Sheet');
  const { fileId } = useParams<{ fileId: string }>();
  const isDemo = fileId === 'demo';
  const fetchDocument = useFetchDocument();
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<SavedEncounter>(
    'encounters',
    isDemo ? undefined : fileId,
    { enabled: !isDemo },
  );
  const error = loadError ? 'Failed to load encounter' : null;

  const { data: indexData } = useIndex('encounters');

  const [form, setForm] = useState<EncounterFormState>(emptyFormState);
  const { settings } = useSettings();
  const [printMode, setPrintMode] = useState(settings.printFriendly);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const zoom = useZoom(settings.defaultZoom);

  const docName = isDemo
    ? 'Demo'
    : (form.encounter || indexData?.items.find((i) => i.fileId === fileId)?.name || '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: 'encounters',
    name: docName,
    fileId: isDemo ? null : (fileId ?? null),
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<SavedEncounter>({
    loaded: isDemo ? undefined : loaded,
    initialize: (saved) => setForm(savedToFormState(saved)),
    isEqualToLocal: (saved) => {
      const { updatedAt: _ignored, ...rest } = saved;
      return JSON.stringify(rest) === JSON.stringify(formStateToSaved(form));
    },
    getUpdatedAt: (saved) => saved.updatedAt,
  });

  const updateForm = useCallback(
    (updater: (prev: EncounterFormState) => EncounterFormState) => {
      setForm((prev) => {
        const next = updater(prev);
        if (!isDemo && !sync.conflict) {
          triggerSave(formStateToSaved(next));
        }
        return next;
      });
    },
    [isDemo, sync.conflict, triggerSave],
  );

  // Malice handlers
  const addMalice = useCallback(() => updateForm((p) => ({ ...p, malice: [...p.malice, emptyMalice()] })), [updateForm]);
  const removeMalice = useCallback((mid: number) => updateForm((p) => ({ ...p, malice: p.malice.filter((m) => m.id !== mid) })), [updateForm]);
  const updateMalice = useCallback((mid: number, field: keyof MaliceEntry, value: string | number) => {
    updateForm((p) => ({ ...p, malice: p.malice.map((m) => (m.id === mid ? { ...m, [field]: value } : m)) }));
  }, [updateForm]);

  // Group handlers
  const addGroup = useCallback(() => updateForm((p) => ({ ...p, groups: [...p.groups, emptyGroup()] })), [updateForm]);
  const removeGroup = useCallback((gid: number) => updateForm((p) => ({ ...p, groups: p.groups.filter((g) => g.id !== gid) })), [updateForm]);
  const updateGroupLabel = useCallback((gid: number, label: string) => {
    updateForm((p) => ({ ...p, groups: p.groups.map((g) => (g.id === gid ? { ...g, label } : g)) }));
  }, [updateForm]);

  // Creature handlers
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

  const { data: monsterIndex } = useIndex('monsters');
  const allGroups = monsterIndex?.items ?? [];
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

  // Import malice from a monster group
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

  // Groups that have malice features
  const groupsWithMalice = useMemo(
    () => allGroups.filter((g) => !!g.hasMalice),
    [allGroups],
  );

  // Build encounter data for JSON
  const encounterData = useMemo<EncounterData>(
    () => ({
      encounter: form.encounter,
      objective: form.objective,
      victory: form.victory,
      failure: form.failure,
      malice: form.malice.map((m) => ({ cost: m.cost, name: m.name, description: m.description })),
      groups: form.groups.map((g) => ({
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
    [form],
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
    if (form.notes.trim()) lines.push(form.notes);
    return lines.join('\n');
  }, [form.notes, encounterData]); // encounterData dep ensures source identity changes

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
      a.download = `${form.encounter || 'encounter-sheet'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error('PDF export failed', {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  }

  const handleKeepLocal = useCallback(() => {
    sync.dismissConflict();
    triggerSave(formStateToSaved(form));
    void flush();
  }, [sync, triggerSave, flush, form]);

  const formPanel = (
    <div className="flex-1 min-w-0 md:w-1/3 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-5">
          {/* Encounter Info */}
          <section className="space-y-2">
            <SectionHeader>Encounter Info</SectionHeader>
            <Field label="Name">
              <input className={inputClass} value={form.encounter} onChange={(e) => updateForm((p) => ({ ...p, encounter: e.target.value }))} />
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

          {/* Malice Features */}
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

          {/* Creature Groups */}
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

          {/* Notes */}
          <section className="space-y-2">
            <SectionHeader>Notes</SectionHeader>
            <textarea
              className={inputClass}
              rows={4}
              value={form.notes}
              onChange={(e) => updateForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Freeform notes (Typst markup supported)"
            />
          </section>
        </div>
    </div>
  );

  const previewPanel = (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <PreviewToolbar
        zoom={zoom}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onExportPdf={handleExportPdf}
        exporting={exporting}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Preview content={source} template="" files={files} zoom={zoom} inputs={inputs} />
      </div>
    </div>
  );

  return (
    <EditorPageShell
      loading={loading}
      error={error}
      backTo="/encounter-sheets"
      parentIcon={Swords}
      parentTitle="Encounter Sheets"
      title={docName || 'Encounter Sheet'}
      saveStatus={isDemo ? undefined : saveStatus}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Mobile tab toggle */}
        <div className="md:hidden flex bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
          <button
            onClick={() => setMobileTab('edit')}
            className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
              mobileTab === 'edit'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
              mobileTab === 'preview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-variant'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Desktop: side by side */}
        <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
          {formPanel}
          {previewPanel}
        </div>

        {/* Mobile: tab-switched */}
        <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
          {mobileTab === 'edit' ? formPanel : previewPanel}
        </div>
      </div>
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
      {/* Row 1: name + bestiary picker + remove */}
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
