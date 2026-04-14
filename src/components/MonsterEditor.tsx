import { useState, useCallback } from 'react';
import type { Monster, Ability, Trait, PowerRollTier, Characteristics } from '@/data/types';

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
    role: '',
    keywords: [],
    ev: 1,
    size: '1M',
    speed: 5,
    stamina: 10,
    stability: 0,
    freeStrike: 1,
    immunity: null,
    weakness: null,
    movement: null,
    characteristics: { might: 0, agility: 0, reason: 0, intuition: 0, presence: 0 },
    abilities: [],
    traits: [],
  };
}

function emptyAbility(): Ability & { _id: number } {
  return {
    _id: uid(),
    name: '',
    type: '',
    action: '',
    keywords: [],
    distance: '',
    target: '',
    powerRoll: [
      { tier: '\u226411', result: '' },
      { tier: '12-16', result: '' },
      { tier: '17+', result: '' },
    ],
    effect: '',
  };
}

function emptyTrait(): Trait & { _id: number } {
  return { _id: uid(), name: '', description: '' };
}

// ── Keyed wrappers for stable list rendering ────────────────────────────────

type KeyedAbility = Ability & { _id: number };
type KeyedTrait = Trait & { _id: number };

function keyAbilities(abilities: Ability[]): KeyedAbility[] {
  return abilities.map((a) => ({ ...a, _id: uid() }));
}

function keyTraits(traits: Trait[]): KeyedTrait[] {
  return traits.map((t) => ({ ...t, _id: uid() }));
}

function stripKeys(abilities: KeyedAbility[]): Ability[] {
  return abilities.map(({ _id, ...rest }) => rest);
}

function stripTraitKeys(traits: KeyedTrait[]): Trait[] {
  return traits.map(({ _id, ...rest }) => rest);
}

// ── Main component ───────────────────────────────────────────────────────────

interface MonsterEditorProps {
  monster: Monster;
  onChange: (monster: Monster) => void;
  onRemove: () => void;
}

export function MonsterEditor({ monster, onChange, onRemove }: MonsterEditorProps) {
  const [expanded, setExpanded] = useState(!monster.name);
  const [abilities, setAbilities] = useState<KeyedAbility[]>(() => keyAbilities(monster.abilities));
  const [traits, setTraits] = useState<KeyedTrait[]>(() => keyTraits(monster.traits));

  const update = useCallback(
    (field: string, value: unknown) => {
      onChange({ ...monster, [field]: value });
    },
    [monster, onChange],
  );

  const updateChar = useCallback(
    (key: keyof Characteristics, value: number) => {
      onChange({ ...monster, characteristics: { ...monster.characteristics, [key]: value } });
    },
    [monster, onChange],
  );

  const updateAbility = useCallback(
    (id: number, field: string, value: unknown) => {
      setAbilities((prev) => {
        const next = prev.map((a) => (a._id === id ? { ...a, [field]: value } : a));
        onChange({ ...monster, abilities: stripKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  const addAbility = useCallback(() => {
    setAbilities((prev) => {
      const next = [...prev, emptyAbility()];
      onChange({ ...monster, abilities: stripKeys(next) });
      return next;
    });
  }, [monster, onChange]);

  const removeAbility = useCallback(
    (id: number) => {
      setAbilities((prev) => {
        const next = prev.filter((a) => a._id !== id);
        onChange({ ...monster, abilities: stripKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  const updateTrait = useCallback(
    (id: number, field: string, value: string) => {
      setTraits((prev) => {
        const next = prev.map((t) => (t._id === id ? { ...t, [field]: value } : t));
        onChange({ ...monster, traits: stripTraitKeys(next) });
        return next;
      });
    },
    [monster, onChange],
  );

  const addTrait = useCallback(() => {
    setTraits((prev) => {
      const next = [...prev, emptyTrait()];
      onChange({ ...monster, traits: stripTraitKeys(next) });
      return next;
    });
  }, [monster, onChange]);

  const removeTrait = useCallback(
    (id: number) => {
      setTraits((prev) => {
        const next = prev.filter((t) => t._id !== id);
        onChange({ ...monster, traits: stripTraitKeys(next) });
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
            L{monster.level} {monster.role} · EV {monster.ev}
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
          <LabeledInput label="Role" value={monster.role} onChange={(v) => update('role', v)} />
          <LabeledInput label="EV" type="number" value={monster.ev} onChange={(v) => update('ev', parseInt(v) || 1)} />
        </div>
        <LabeledInput label="Keywords (comma-separated)" value={monster.keywords.join(', ')} onChange={(v) => update('keywords', v.split(',').map((s) => s.trim()).filter(Boolean))} />
      </Section>

      {/* Combat Stats */}
      <Section label="Combat Stats">
        <div className="grid grid-cols-5 gap-2">
          <LabeledInput label="Size" value={monster.size} onChange={(v) => update('size', v)} />
          <LabeledInput label="Speed" type="number" value={monster.speed} onChange={(v) => update('speed', parseInt(v) || 0)} />
          <LabeledInput label="Stamina" type="number" value={monster.stamina} onChange={(v) => update('stamina', parseInt(v) || 0)} />
          <LabeledInput label="Stability" type="number" value={monster.stability} onChange={(v) => update('stability', parseInt(v) || 0)} />
          <LabeledInput label="Free Strike" type="number" value={monster.freeStrike} onChange={(v) => update('freeStrike', parseInt(v) || 0)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <LabeledInput label="Immunity" value={monster.immunity ?? ''} onChange={(v) => update('immunity', v || null)} placeholder="e.g., Corruption 1" />
          <LabeledInput label="Weakness" value={monster.weakness ?? ''} onChange={(v) => update('weakness', v || null)} placeholder="e.g., Holy 3" />
          <LabeledInput label="Movement" value={monster.movement ?? ''} onChange={(v) => update('movement', v || null)} placeholder="e.g., Fly, Teleport" />
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
              value={monster.characteristics[key]}
              onChange={(v) => updateChar(key, parseInt(v) || 0)}
            />
          ))}
        </div>
      </Section>

      {/* Abilities */}
      <Section label="Abilities">
        {abilities.map((ab) => (
          <AbilityEditor
            key={ab._id}
            ability={ab}
            onChange={(field, value) => updateAbility(ab._id, field, value)}
            onRemove={() => removeAbility(ab._id)}
          />
        ))}
        <AddButton onClick={addAbility}>Add Ability</AddButton>
      </Section>

      {/* Traits */}
      <Section label="Traits">
        {traits.map((tr) => (
          <div key={tr._id} className="flex gap-2 items-start">
            <div className="flex-1 grid grid-cols-[1fr_2fr] gap-2">
              <input className={inputClass} value={tr.name} onChange={(e) => updateTrait(tr._id, 'name', e.target.value)} placeholder="Name" />
              <input className={inputClass} value={tr.description} onChange={(e) => updateTrait(tr._id, 'description', e.target.value)} placeholder="Description" />
            </div>
            <button onClick={() => removeTrait(tr._id)} className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
        <AddButton onClick={addTrait}>Add Trait</AddButton>
      </Section>
    </div>
  );
}

// ── Ability editor ───────────────────────────────────────────────────────────

function AbilityEditor({
  ability,
  onChange,
  onRemove,
}: {
  ability: KeyedAbility;
  onChange: (field: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [showPowerRoll, setShowPowerRoll] = useState(
    (ability.powerRoll?.length ?? 0) > 0 && ability.powerRoll!.some((t) => t.result !== ''),
  );

  const updatePowerRollTier = (index: number, field: keyof PowerRollTier, value: string) => {
    const pr = [...(ability.powerRoll ?? [])];
    pr[index] = { ...pr[index], [field]: value };
    onChange('powerRoll', pr);
  };

  return (
    <div className="p-3 rounded-sm bg-surface-container-low/50 space-y-2">
      {/* Row 1: name, type, action, remove */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 grid grid-cols-[1fr_auto_auto] gap-2">
          <input className={inputClass} value={ability.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Ability name" />
          <input className={`${inputClass} w-36`} value={ability.type ?? ''} onChange={(e) => onChange('type', e.target.value || undefined)} placeholder="Type (optional)" />
          <input className={`${inputClass} w-28`} value={ability.action ?? ''} onChange={(e) => onChange('action', e.target.value || undefined)} placeholder="Action" />
        </div>
        <button onClick={onRemove} className="p-1 text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {/* Row 2: keywords, distance, target */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input className={inputClass} value={(ability.keywords ?? []).join(', ')} onChange={(e) => onChange('keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Keywords (comma-separated)" />
        <input className={`${inputClass} w-28`} value={ability.distance ?? ''} onChange={(e) => onChange('distance', e.target.value || undefined)} placeholder="Distance" />
        <input className={`${inputClass} w-36`} value={ability.target ?? ''} onChange={(e) => onChange('target', e.target.value || undefined)} placeholder="Target" />
      </div>

      {/* Damage */}
      <input className={`${inputClass} w-full`} value={ability.damage ?? ''} onChange={(e) => onChange('damage', e.target.value || undefined)} placeholder="Damage (optional)" />

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
        {showPowerRoll && (
          <div className="mt-2 space-y-1">
            {(ability.powerRoll ?? []).map((tier, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr] gap-2">
                <input className={`${inputClass} text-center text-xs`} value={tier.tier} onChange={(e) => updatePowerRollTier(i, 'tier', e.target.value)} />
                <input className={inputClass} value={tier.result} onChange={(e) => updatePowerRollTier(i, 'result', e.target.value)} placeholder="Result" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Effect */}
      <textarea
        className={`${inputClass} w-full`}
        rows={2}
        value={ability.effect ?? ''}
        onChange={(e) => onChange('effect', e.target.value || undefined)}
        placeholder="Effect (optional)"
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
