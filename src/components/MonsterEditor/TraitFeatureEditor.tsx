import { Field, Input } from '@/components/form';
import type { Feature } from '@/data/bestiary';

interface TraitFeatureEditorProps {
  feature: Feature;
  onChange: (updater: (f: Feature) => Feature) => void;
}

export function TraitFeatureEditor({ feature, onChange }: TraitFeatureEditorProps) {
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
