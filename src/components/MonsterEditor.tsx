import { useState, useCallback } from 'react';
import type { Monster, Feature, Effect } from '@/data/types';
import { ChevronDown, ChevronUp, ChevronRight, X, Plus, ArrowUp, ArrowDown } from 'lucide-react';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputClass = 'bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-[10px] font-label text-on-surface-variant/70';

// ── ID helper ────────────────────────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return _nextId++;
}

// ── Empty defaults ───────────────────────────────────────────────────────────

export function emptyMonster(): Monster {
  return {
    name: '',
    level: 1,
    roles: [],
    ancestry: [],
    ev: 1,
    size: '1M',
    speed: 5,
    stamina: 10,
    stability: 0,
    free_strike: 1,
    might: 0,
    agility: 0,
    reason: 0,
    intuition: 0,
    presence: 0,
    features: [],
  };
}

function emptyAbilityFeature(): Feature & { _id: number } {
  return {
    _id: uid(),
    type: 'feature',
    feature_type: 'ability',
    name: '',
    ability_type: '',
    usage: '',
    keywords: [],
    distance: '',
    target: '',
    effects: [
      { name: 'Effect', effect: '' },
    ],
  };
}

function emptyTraitFeature(): Feature & { _id: number } {
  return {
    _id: uid(),
    type: 'feature',
    feature_type: 'trait',
    name: '',
    effects: [{ effect: '' }],
  };
}

// ── Keyed wrappers for stable list rendering ────────────────────────────────

type KeyedFeature = Feature & { _id: number };

function keyFeatures(features: Feature[]): KeyedFeature[] {
  return features.map((f) => ({ ...f, _id: uid() }));
}

function stripKeys(features: KeyedFeature[]): Feature[] {
  return features.map(({ _id, ...rest }) => rest);
}

// ── Main component ───────────────────────────────────────────────────────────

interface MonsterEditorProps {
  monster: Monster;
  onChange: (monster: Monster) => void;
  onRemove: () => void;
}

export function MonsterEditor({ monster, onChange, onRemove }: MonsterEditorProps) {
  const [expanded, setExpanded] = useState(!monster.name);
  const [features, setFeatures] = useState<KeyedFeature[]>(() => keyFeatures(monster.features));

  const update = useCallback(
    (field: string, value: unknown) => {
      onChange({ ...monster, [field]: value });
    },
    [monster, onChange],
  );

  const updateFeature = useCallback(
    (id: number, updater: (f: KeyedFeature) => KeyedFeature) => {
      setFeatures((prev) => {
        const next = prev.map((f) => (f._id === id ? updater(f) : f));
        onChange({ ...monster, features: stripKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  const addAbility = useCallback(() => {
    setFeatures((prev) => {
      const next = [...prev, emptyAbilityFeature()];
      onChange({ ...monster, features: stripKeys(next) });
      return next;
    });
  }, [monster, onChange]);

  const addTrait = useCallback(() => {
    setFeatures((prev) => {
      const next = [...prev, emptyTraitFeature()];
      onChange({ ...monster, features: stripKeys(next) });
      return next;
    });
  }, [monster, onChange]);

  const removeFeature = useCallback(
    (id: number) => {
      setFeatures((prev) => {
        const next = prev.filter((f) => f._id !== id);
        onChange({ ...monster, features: stripKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  const moveFeature = useCallback(
    (id: number, direction: -1 | 1) => {
      setFeatures((prev) => {
        const idx = prev.findIndex((f) => f._id === id);
        if (idx < 0) return prev;
        const target = idx + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange({ ...monster, features: stripKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  // ── Collapsed summary row ──────────────────────────────────────────────────

  if (!expanded) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-sm bg-surface-container/50">
        <button
          onClick={() => setExpanded(true)}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Expand ${monster.name || 'Unnamed Monster'}`}
        >
          <ChevronDown size={18} className="text-primary" aria-hidden="true" />
          <span className="text-sm font-body font-semibold text-on-surface">
            {monster.name || 'Unnamed Monster'}
          </span>
          <span className="text-xs font-label text-on-surface-variant">
            L{monster.level} {monster.roles.join(', ')} · EV {monster.ev ?? '-'}
          </span>
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Remove monster"
          title="Remove monster"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  // ── Expanded editor ────────────────────────────────────────────────────────

  return (
    <div className="rounded-sm bg-surface-container/50 p-4 space-y-4">
      {/* Collapse + remove header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(false)}
          className="p-0.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Collapse ${monster.name || 'New Monster'}`}
        >
          <ChevronUp size={18} aria-hidden="true" />
        </button>
        <span className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant flex-1">
          {monster.name || 'New Monster'}
        </span>
        <button
          onClick={onRemove}
          className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Remove monster"
          title="Remove monster"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Identity */}
      <Section label="Identity">
        <div className="grid grid-cols-[1fr_60px] md:grid-cols-[1fr_60px_1fr_60px] gap-2">
          <LabeledInput label="Name" value={monster.name} onChange={(v) => update('name', v)} />
          <LabeledInput label="Level" type="number" value={monster.level} onChange={(v) => update('level', parseInt(v) || 1)} />
          <LabeledInput label="Roles" value={monster.roles.join(', ')} onChange={(v) => update('roles', v.split(',').map((s) => s.trim()).filter(Boolean))} />
          <LabeledInput label="EV" type="number" value={monster.ev ?? ''} onChange={(v) => update('ev', v ? parseInt(v) || 0 : null)} />
        </div>
        <LabeledInput label="Ancestry" value={monster.ancestry.join(', ')} onChange={(v) => update('ancestry', v.split(',').map((s) => s.trim()).filter(Boolean))} />
      </Section>

      {/* Combat Stats */}
      <Section label="Combat Stats">
        <div className="grid grid-cols-5 gap-2">
          <LabeledInput label="Size" value={monster.size} onChange={(v) => update('size', v)} />
          <LabeledInput label="Speed" type="number" value={monster.speed} onChange={(v) => update('speed', parseInt(v) || 0)} />
          <LabeledInput label="Stamina" type="number" value={monster.stamina} onChange={(v) => update('stamina', parseInt(v) || 0)} />
          <LabeledInput label="Stability" type="number" value={monster.stability} onChange={(v) => update('stability', parseInt(v) || 0)} />
          <LabeledInput label="Free Strike" type="number" value={monster.free_strike} onChange={(v) => update('free_strike', parseInt(v) || 0)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <LabeledInput label="Immunities" value={(monster.immunities ?? []).join(', ')} onChange={(v) => { const arr = v.split(',').map((s) => s.trim()).filter(Boolean); update('immunities', arr.length ? arr : undefined); }} placeholder="e.g., Fire 5" />
          <LabeledInput label="Weaknesses" value={(monster.weaknesses ?? []).join(', ')} onChange={(v) => { const arr = v.split(',').map((s) => s.trim()).filter(Boolean); update('weaknesses', arr.length ? arr : undefined); }} placeholder="e.g., Holy 3" />
          <LabeledInput label="Movement" value={monster.movement ?? ''} onChange={(v) => update('movement', v || undefined)} placeholder="e.g., Fly, Teleport" />
        </div>
      </Section>

      {/* Characteristics */}
      <Section label="Characteristics">
        <div className="grid grid-cols-5 gap-2">
          {(['might', 'agility', 'reason', 'intuition', 'presence'] as const).map((key) => (
            <LabeledInput
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              type="number"
              value={monster[key]}
              onChange={(v) => update(key, parseInt(v) || 0)}
            />
          ))}
        </div>
      </Section>

      {/* Features (Abilities + Traits) */}
      <Section label="Features">
        {features.map((feat, idx) => (
          <FeatureWrapper
            key={feat._id}
            feature={feat}
            isFirst={idx === 0}
            isLast={idx === features.length - 1}
            onMoveUp={() => moveFeature(feat._id, -1)}
            onMoveDown={() => moveFeature(feat._id, 1)}
            onRemove={() => removeFeature(feat._id)}
          >
            {feat.feature_type === 'ability' ? (
              <AbilityFeatureEditor
                feature={feat}
                onChange={(updater) => updateFeature(feat._id, updater)}
              />
            ) : (
              <TraitFeatureEditor
                feature={feat}
                onChange={(updater) => updateFeature(feat._id, updater)}
              />
            )}
          </FeatureWrapper>
        ))}
        <div className="flex gap-3">
          <AddButton onClick={addAbility}>Add Ability</AddButton>
          <AddButton onClick={addTrait}>Add Trait</AddButton>
        </div>
      </Section>
    </div>
  );
}

// ── Feature wrapper (collapse, reorder, remove) ────────────────────────────

function FeatureWrapper({
  feature,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  feature: KeyedFeature;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(!!feature.name);
  const label = feature.name || (feature.feature_type === 'ability' ? 'Unnamed Ability' : 'Unnamed Trait');
  const tag = feature.feature_type === 'ability' ? 'Ability' : 'Trait';

  return (
    <div className="rounded-sm bg-surface-container-low border border-outline-variant/20">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
        <span className="text-xs font-label font-bold text-on-surface truncate flex-1">
          {label}
        </span>
        <span className="text-[9px] font-label text-on-surface-variant/50 uppercase tracking-wide">
          {tag}
        </span>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-0.5 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-sm disabled:opacity-30 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Move up"
          title="Move up"
        >
          <ArrowUp size={14} aria-hidden="true" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-0.5 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-sm disabled:opacity-30 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Move down"
          title="Move down"
        >
          <ArrowDown size={14} aria-hidden="true" />
        </button>
        <button
          onClick={onRemove}
          className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Remove ${label}`}
          title="Remove"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Ability Feature editor ──────────────────────────────────────────────────

function AbilityFeatureEditor({
  feature,
  onChange,
}: {
  feature: KeyedFeature;
  onChange: (updater: (f: KeyedFeature) => KeyedFeature) => void;
}) {
  const set = (field: string, value: unknown) =>
    onChange((f) => ({ ...f, [field]: value }));

  const updateEffect = (index: number, patch: Partial<Effect>) => {
    onChange((f) => ({
      ...f,
      effects: f.effects.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  };

  const removeEffect = (index: number) => {
    onChange((f) => ({
      ...f,
      effects: f.effects.filter((_, i) => i !== index),
    }));
  };

  const addEffect = () => {
    onChange((f) => ({
      ...f,
      effects: [...f.effects, { name: 'Effect', effect: '' }],
    }));
  };

  // Find power roll and named effects
  const prIndex = feature.effects.findIndex((e) => e.roll != null);
  const hasPowerRoll = prIndex >= 0;
  const namedEffects = feature.effects
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.roll == null);

  const addPowerRoll = () => {
    onChange((f) => ({
      ...f,
      effects: [{ roll: 0, tier1: '', tier2: '', tier3: '' }, ...f.effects],
    }));
  };

  const removePowerRoll = () => {
    onChange((f) => ({
      ...f,
      effects: f.effects.filter((e) => e.roll == null),
    }));
  };

  return (
    <div className="space-y-2">
      {/* Desktop: name, type, usage on one row; Mobile: stacked */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
        <LabeledInput label="Name" value={feature.name} onChange={(v) => set('name', v)} />
        <LabeledSelect label="Type" value={feature.ability_type ?? ''} onChange={(v) => set('ability_type', v || undefined)} options={ABILITY_TYPES} placeholder="(none)" />
        <LabeledSelect label="Usage" value={feature.usage ?? ''} onChange={(v) => set('usage', v || undefined)} options={ABILITY_USAGES} placeholder="(none)" />
      </div>

      {/* Desktop: keywords, distance, target on one row; Mobile: stacked */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
        <LabeledInput label="Keywords" value={(feature.keywords ?? []).join(', ')} onChange={(v) => set('keywords', v.split(',').map((s: string) => s.trim()).filter(Boolean))} />
        <LabeledInput label="Distance" value={feature.distance ?? ''} onChange={(v) => set('distance', v || undefined)} />
        <LabeledInput label="Target" value={feature.target ?? ''} onChange={(v) => set('target', v || undefined)} />
      </div>

      {/* Trigger (for triggered actions) */}
      {feature.trigger != null && (
        <LabeledInput label="Trigger" value={feature.trigger} onChange={(v) => set('trigger', v || undefined)} />
      )}

      {/* Power Roll */}
      {hasPowerRoll ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className={labelClass}>Power Roll</div>
            <button
              onClick={removePowerRoll}
              className="text-[10px] font-label text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div>
              <div className={labelClass}>Bonus</div>
              <input type="number" className={`${inputClass} w-full text-center`} value={feature.effects[prIndex].roll ?? 0} onChange={(e) => updateEffect(prIndex, { roll: parseInt(e.target.value) || 0 })} />
            </div>
            <div />
          </div>
          {(['tier1', 'tier2', 'tier3'] as const).map((tier, i) => (
            <div key={tier} className="grid grid-cols-[80px_1fr] gap-2">
              <span className={`${inputClass} text-center text-xs flex items-center justify-center`}>
                {i === 0 ? '\u226411' : i === 1 ? '12-16' : '17+'}
              </span>
              <input className={inputClass} value={feature.effects[prIndex][tier] ?? ''} onChange={(e) => updateEffect(prIndex, { [tier]: e.target.value })} placeholder="Result" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Named effects */}
      {namedEffects.map(({ e, i }) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2 items-center">
            <input
              className={`${inputClass} w-24`}
              value={e.name ?? ''}
              onChange={(ev) => updateEffect(i, { name: ev.target.value })}
              placeholder="Label"
            />
            <input
              className={`${inputClass} w-16 text-center`}
              value={e.cost ?? ''}
              onChange={(ev) => updateEffect(i, { cost: ev.target.value || undefined })}
              placeholder="Cost"
            />
            <div className="flex-1" />
            <button
              onClick={() => removeEffect(i)}
              className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Remove effect"
              title="Remove effect"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <textarea
            className={`${inputClass} w-full`}
            rows={2}
            value={e.effect ?? ''}
            onChange={(ev) => updateEffect(i, { effect: ev.target.value })}
            placeholder="Effect text"
          />
        </div>
      ))}

      {/* Add buttons */}
      <div className="flex gap-3">
        {!hasPowerRoll && (
          <AddButton onClick={addPowerRoll}>Add Power Roll</AddButton>
        )}
        <AddButton onClick={addEffect}>Add Effect</AddButton>
        {feature.trigger == null && (
          <AddButton onClick={() => set('trigger', '')}>Add Trigger</AddButton>
        )}
      </div>
    </div>
  );
}

// ── Trait Feature editor ────────────────────────────────────────────────────

function TraitFeatureEditor({
  feature,
  onChange,
}: {
  feature: KeyedFeature;
  onChange: (updater: (f: KeyedFeature) => KeyedFeature) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_2fr] gap-2">
      <LabeledInput
        label="Name"
        value={feature.name}
        onChange={(v) => onChange((f) => ({ ...f, name: v }))}
      />
      <LabeledInput
        label="Description"
        value={feature.effects[0]?.effect ?? ''}
        onChange={(v) =>
          onChange((f) => ({
            ...f,
            effects: [{ ...f.effects[0], effect: v }],
          }))
        }
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-label font-bold tracking-wide uppercase text-on-surface-variant/70">
        {label}
      </h4>
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <input
        type={type}
        className={`${inputClass} w-full`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <select
        className={`${inputClass} w-full`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? `Select ${label.toLowerCase()}`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

const ABILITY_TYPES = [
  'Signature Ability',
  'Villain Action 1',
  'Villain Action 2',
  'Villain Action 3',
];

const ABILITY_USAGES = [
  'Main action',
  'Maneuver',
  'Triggered action',
  'Free maneuver',
  'Free triggered action',
];

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
    >
      <Plus size={14} aria-hidden="true" />
      {children}
    </button>
  );
}
