import { useState, useCallback } from 'react';
import { emptyAbilityFeature, emptyTraitFeature, type Monster, type Feature, type Effect } from '@/data/bestiary';
import { ChevronDown, ChevronUp, ChevronRight, X, ArrowUp, ArrowDown } from 'lucide-react';
import { AddButton, Field, Input, Select } from '@/components/form';
import { compactLabelClass, inputBaseClass, inputSizeClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';
import { removeById, updateById } from '@/lib/arrays';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputClass = cn(inputBaseClass, inputSizeClass.md);
const labelClass = compactLabelClass;

// ── Main component ───────────────────────────────────────────────────────────

interface MonsterEditorProps {
  monster: Monster;
  onChange: (monster: Monster) => void;
  onRemove: () => void;
}

export function MonsterEditor({ monster, onChange, onRemove }: MonsterEditorProps) {
  const [expanded, setExpanded] = useState(!monster.name);
  const features = monster.features;

  const update = useCallback(
    (field: string, value: unknown) => {
      onChange({ ...monster, [field]: value });
    },
    [monster, onChange],
  );

  const setFeatures = useCallback(
    (next: Feature[]) => onChange({ ...monster, features: next }),
    [monster, onChange],
  );

  const moveFeature = useCallback(
    (id: string, direction: -1 | 1) => {
      const idx = features.findIndex((f) => f.id === id);
      if (idx < 0) return;
      const target = idx + direction;
      if (target < 0 || target >= features.length) return;
      const next = [...features];
      [next[idx], next[target]] = [next[target], next[idx]];
      setFeatures(next);
    },
    [features, setFeatures],
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
          <Field label="Name" compact><Input value={monster.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Level" compact><Input type="number" value={monster.level} onChange={(e) => update('level', parseInt(e.target.value) || 1)} /></Field>
          <Field label="Roles" compact><Input value={monster.roles.join(', ')} onChange={(e) => update('roles', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="EV" compact><Input type="number" value={monster.ev ?? ''} onChange={(e) => update('ev', e.target.value ? parseInt(e.target.value) || 0 : null)} /></Field>
        </div>
        <Field label="Ancestry" compact><Input value={monster.ancestry.join(', ')} onChange={(e) => update('ancestry', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
      </Section>

      {/* Combat Stats */}
      <Section label="Combat Stats">
        <div className="grid grid-cols-5 gap-2">
          <Field label="Size" compact><Input value={monster.size} onChange={(e) => update('size', e.target.value)} /></Field>
          <Field label="Speed" compact><Input type="number" value={monster.speed} onChange={(e) => update('speed', parseInt(e.target.value) || 0)} /></Field>
          <Field label="Stamina" compact><Input type="number" value={monster.stamina} onChange={(e) => update('stamina', parseInt(e.target.value) || 0)} /></Field>
          <Field label="Stability" compact><Input type="number" value={monster.stability} onChange={(e) => update('stability', parseInt(e.target.value) || 0)} /></Field>
          <Field label="Free Strike" compact><Input type="number" value={monster.free_strike} onChange={(e) => update('free_strike', parseInt(e.target.value) || 0)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Immunities" compact><Input value={(monster.immunities ?? []).join(', ')} onChange={(e) => { const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); update('immunities', arr.length ? arr : undefined); }} placeholder="e.g., Fire 5" /></Field>
          <Field label="Weaknesses" compact><Input value={(monster.weaknesses ?? []).join(', ')} onChange={(e) => { const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); update('weaknesses', arr.length ? arr : undefined); }} placeholder="e.g., Holy 3" /></Field>
          <Field label="Movement" compact><Input value={monster.movement ?? ''} onChange={(e) => update('movement', e.target.value || undefined)} placeholder="e.g., Fly, Teleport" /></Field>
        </div>
      </Section>

      {/* Characteristics */}
      <Section label="Characteristics">
        <div className="grid grid-cols-5 gap-2">
          {(['might', 'agility', 'reason', 'intuition', 'presence'] as const).map((key) => (
            <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} compact>
              <Input
                type="number"
                value={monster[key]}
                onChange={(e) => update(key, parseInt(e.target.value) || 0)}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* Features (Abilities + Traits) */}
      <Section label="Features">
        {features.map((feat, idx) => (
          <FeatureWrapper
            key={feat.id}
            feature={feat}
            isFirst={idx === 0}
            isLast={idx === features.length - 1}
            onMoveUp={() => moveFeature(feat.id, -1)}
            onMoveDown={() => moveFeature(feat.id, 1)}
            onRemove={() => setFeatures(removeById(features, feat.id))}
          >
            {feat.feature_type === 'ability' ? (
              <AbilityFeatureEditor
                feature={feat}
                onChange={(updater) => setFeatures(updateById(features, feat.id, updater))}
              />
            ) : (
              <TraitFeatureEditor
                feature={feat}
                onChange={(updater) => setFeatures(updateById(features, feat.id, updater))}
              />
            )}
          </FeatureWrapper>
        ))}
        <div className="flex gap-3">
          <AddButton onClick={() => setFeatures([...features, emptyAbilityFeature()])}>Add Ability</AddButton>
          <AddButton onClick={() => setFeatures([...features, emptyTraitFeature()])}>Add Trait</AddButton>
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
  feature: Feature;
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
  feature: Feature;
  onChange: (updater: (f: Feature) => Feature) => void;
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
        <Field label="Name" compact><Input value={feature.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Type" compact>
          <Select value={feature.ability_type ?? ''} onChange={(e) => set('ability_type', e.target.value || undefined)}>
            <option value="">(none)</option>
            {ABILITY_TYPES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
        </Field>
        <Field label="Usage" compact>
          <Select value={feature.usage ?? ''} onChange={(e) => set('usage', e.target.value || undefined)}>
            <option value="">(none)</option>
            {ABILITY_USAGES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
        </Field>
      </div>

      {/* Desktop: keywords, distance, target on one row; Mobile: stacked */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
        <Field label="Keywords" compact><Input value={(feature.keywords ?? []).join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} /></Field>
        <Field label="Distance" compact><Input value={feature.distance ?? ''} onChange={(e) => set('distance', e.target.value || undefined)} /></Field>
        <Field label="Target" compact><Input value={feature.target ?? ''} onChange={(e) => set('target', e.target.value || undefined)} /></Field>
      </div>

      {/* Trigger (for triggered actions) */}
      {feature.trigger != null && (
        <Field label="Trigger" compact><Input value={feature.trigger} onChange={(e) => set('trigger', e.target.value || undefined)} /></Field>
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
  feature: Feature;
  onChange: (updater: (f: Feature) => Feature) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_2fr] gap-2">
      <Field label="Name" compact>
        <Input
          value={feature.name}
          onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <Field label="Description" compact>
        <Input
          value={feature.effects[0]?.effect ?? ''}
          onChange={(e) =>
            onChange((f) => ({
              ...f,
              effects: [{ ...f.effects[0], effect: e.target.value }],
            }))
          }
        />
      </Field>
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

