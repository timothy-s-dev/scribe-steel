import { useState, useCallback } from 'react';
import type { Monster, Feature, Effect } from '@/data/types';

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
      { roll: 0, tier1: '', tier2: '', tier3: '' },
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

  // ── Collapsed summary row ──────────────────────────────────────────────────

  if (!expanded) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-sm bg-surface-container/50">
        <button
          onClick={() => setExpanded(true)}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg text-primary">expand_more</span>
          <span className="text-sm font-body font-semibold text-on-surface">
            {monster.name || 'Unnamed Monster'}
          </span>
          <span className="text-xs font-label text-on-surface-variant">
            L{monster.level} {monster.roles.join(', ')} · EV {monster.ev ?? '-'}
          </span>
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer"
          title="Remove monster"
        >
          <span className="material-symbols-outlined text-base">close</span>
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
          className="p-0.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">expand_less</span>
        </button>
        <span className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant flex-1">
          {monster.name || 'New Monster'}
        </span>
        <button
          onClick={onRemove}
          className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer"
          title="Remove monster"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Identity */}
      <Section label="Identity">
        <div className="grid grid-cols-[1fr_60px_1fr_60px] gap-2">
          <LabeledInput label="Name" value={monster.name} onChange={(v) => update('name', v)} />
          <LabeledInput label="Level" type="number" value={monster.level} onChange={(v) => update('level', parseInt(v) || 1)} />
          <LabeledInput label="Roles (comma-sep)" value={monster.roles.join(', ')} onChange={(v) => update('roles', v.split(',').map((s) => s.trim()).filter(Boolean))} />
          <LabeledInput label="EV" type="number" value={monster.ev ?? ''} onChange={(v) => update('ev', v ? parseInt(v) || 0 : null)} />
        </div>
        <LabeledInput label="Ancestry (comma-separated)" value={monster.ancestry.join(', ')} onChange={(v) => update('ancestry', v.split(',').map((s) => s.trim()).filter(Boolean))} />
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
          <LabeledInput label="Immunities (comma-sep)" value={(monster.immunities ?? []).join(', ')} onChange={(v) => { const arr = v.split(',').map((s) => s.trim()).filter(Boolean); update('immunities', arr.length ? arr : undefined); }} placeholder="e.g., Fire 5" />
          <LabeledInput label="Weaknesses (comma-sep)" value={(monster.weaknesses ?? []).join(', ')} onChange={(v) => { const arr = v.split(',').map((s) => s.trim()).filter(Boolean); update('weaknesses', arr.length ? arr : undefined); }} placeholder="e.g., Holy 3" />
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
        {features.map((feat) => (
          feat.feature_type === 'ability' ? (
            <AbilityFeatureEditor
              key={feat._id}
              feature={feat}
              onChange={(updater) => updateFeature(feat._id, updater)}
              onRemove={() => removeFeature(feat._id)}
            />
          ) : (
            <TraitFeatureEditor
              key={feat._id}
              feature={feat}
              onChange={(updater) => updateFeature(feat._id, updater)}
              onRemove={() => removeFeature(feat._id)}
            />
          )
        ))}
        <div className="flex gap-3">
          <AddButton onClick={addAbility}>Add Ability</AddButton>
          <AddButton onClick={addTrait}>Add Trait</AddButton>
        </div>
      </Section>
    </div>
  );
}

// ── Ability Feature editor ──────────────────────────────────────────────────

function AbilityFeatureEditor({
  feature,
  onChange,
  onRemove,
}: {
  feature: KeyedFeature;
  onChange: (updater: (f: KeyedFeature) => KeyedFeature) => void;
  onRemove: () => void;
}) {
  const powerRollEffect = feature.effects.find((e) => e.roll != null);
  const [showPowerRoll, setShowPowerRoll] = useState(
    powerRollEffect != null && (powerRollEffect.tier1 !== '' || powerRollEffect.tier2 !== '' || powerRollEffect.tier3 !== ''),
  );

  const set = (field: string, value: unknown) =>
    onChange((f) => ({ ...f, [field]: value }));

  const updateEffect = (index: number, patch: Partial<Effect>) => {
    onChange((f) => ({
      ...f,
      effects: f.effects.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));
  };

  // Find indices for power roll and named effects
  const prIndex = feature.effects.findIndex((e) => e.roll != null);
  const namedEffects = feature.effects
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.roll == null && e.effect != null);

  return (
    <div className="p-3 rounded-sm bg-surface-container-low/50 space-y-2">
      {/* Row 1: name, ability_type, usage, remove */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 grid grid-cols-[1fr_auto_auto] gap-2">
          <input className={inputClass} value={feature.name} onChange={(e) => set('name', e.target.value)} placeholder="Ability name" />
          <input className={`${inputClass} w-36`} value={feature.ability_type ?? ''} onChange={(e) => set('ability_type', e.target.value || undefined)} placeholder="Type (optional)" />
          <input className={`${inputClass} w-28`} value={feature.usage ?? ''} onChange={(e) => set('usage', e.target.value || undefined)} placeholder="Usage" />
        </div>
        <button onClick={onRemove} className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Row 2: keywords, distance, target */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input className={inputClass} value={(feature.keywords ?? []).join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Keywords (comma-separated)" />
        <input className={`${inputClass} w-28`} value={feature.distance ?? ''} onChange={(e) => set('distance', e.target.value || undefined)} placeholder="Distance" />
        <input className={`${inputClass} w-36`} value={feature.target ?? ''} onChange={(e) => set('target', e.target.value || undefined)} placeholder="Target" />
      </div>

      {/* Power Roll toggle + tiers */}
      <div>
        <button
          onClick={() => setShowPowerRoll(!showPowerRoll)}
          className="text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">
            {showPowerRoll ? 'expand_less' : 'expand_more'}
          </span>
          Power Roll
        </button>
        {showPowerRoll && prIndex >= 0 && (
          <div className="mt-2 space-y-1">
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
        )}
      </div>

      {/* Named effects */}
      {namedEffects.map(({ e, i }) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-label text-on-surface-variant">{e.name || 'Effect'}:</span>
            {e.cost && <span className="text-xs font-label text-primary">{e.cost}</span>}
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
    </div>
  );
}

// ── Trait Feature editor ────────────────────────────────────────────────────

function TraitFeatureEditor({
  feature,
  onChange,
  onRemove,
}: {
  feature: KeyedFeature;
  onChange: (updater: (f: KeyedFeature) => KeyedFeature) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-[1fr_2fr] gap-2">
        <input
          className={inputClass}
          value={feature.name}
          onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
          placeholder="Trait name"
        />
        <input
          className={inputClass}
          value={feature.effects[0]?.effect ?? ''}
          onChange={(e) =>
            onChange((f) => ({
              ...f,
              effects: [{ ...f.effects[0], effect: e.target.value }],
            }))
          }
          placeholder="Description"
        />
      </div>
      <button onClick={onRemove} className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
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

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
    >
      <span className="material-symbols-outlined text-sm">add</span>
      {children}
    </button>
  );
}
