import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { AddButton, Field, Input } from '@/components/form';
import { emptyAbilityFeature, emptyTraitFeature, type Feature, type Monster } from '@/data/bestiary';
import { removeById, updateById } from '@/lib/arrays';
import { AbilityFeatureEditor } from './AbilityFeatureEditor';
import { FeatureWrapper } from './FeatureWrapper';
import { TraitFeatureEditor } from './TraitFeatureEditor';

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

  return (
    <div className="rounded-sm bg-surface-container/50 p-4 space-y-4">
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

      <Section label="Identity">
        <div className="grid grid-cols-[1fr_60px] md:grid-cols-[1fr_60px_1fr_60px] gap-2">
          <Field label="Name" compact><Input value={monster.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Level" compact><Input type="number" value={monster.level} onChange={(e) => update('level', parseInt(e.target.value) || 1)} /></Field>
          <Field label="Roles" compact><Input value={monster.roles.join(', ')} onChange={(e) => update('roles', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="EV" compact><Input type="number" value={monster.ev ?? ''} onChange={(e) => update('ev', e.target.value ? parseInt(e.target.value) || 0 : null)} /></Field>
        </div>
        <Field label="Ancestry" compact><Input value={monster.ancestry.join(', ')} onChange={(e) => update('ancestry', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
      </Section>

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
