import { AddButton, Field, Input, Select } from '@/components/form';
import type { Effect, Feature } from '@/data/bestiary';
import { ABILITY_TYPES, ABILITY_USAGES } from './constants';
import { NamedEffectsEditor } from './NamedEffectsEditor';
import { PowerRollEditor } from './PowerRollEditor';

interface AbilityFeatureEditorProps {
  feature: Feature;
  onChange: (updater: (f: Feature) => Feature) => void;
}

export function AbilityFeatureEditor({ feature, onChange }: AbilityFeatureEditorProps) {
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

  const prIndex = feature.effects.findIndex((e) => e.roll != null);
  const hasPowerRoll = prIndex >= 0;
  const namedEffects = feature.effects
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect }) => effect.roll == null);

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
        <Field label="Keywords" compact><Input value={(feature.keywords ?? []).join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
        <Field label="Distance" compact><Input value={feature.distance ?? ''} onChange={(e) => set('distance', e.target.value || undefined)} /></Field>
        <Field label="Target" compact><Input value={feature.target ?? ''} onChange={(e) => set('target', e.target.value || undefined)} /></Field>
      </div>

      {feature.trigger != null && (
        <Field label="Trigger" compact><Input value={feature.trigger} onChange={(e) => set('trigger', e.target.value || undefined)} /></Field>
      )}

      {hasPowerRoll && (
        <PowerRollEditor
          effect={feature.effects[prIndex]}
          onUpdate={(patch) => updateEffect(prIndex, patch)}
          onRemove={removePowerRoll}
        />
      )}

      <NamedEffectsEditor
        effects={namedEffects}
        onUpdate={updateEffect}
        onRemove={removeEffect}
      />

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
