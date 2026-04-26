import { X } from 'lucide-react';
import { Input, Textarea } from '@/components/forms/common';
import type { Effect } from '@/data/bestiary';

interface NamedEffect {
  effect: Effect;
  index: number;
}

interface NamedEffectsEditorProps {
  effects: NamedEffect[];
  onUpdate: (index: number, patch: Partial<Effect>) => void;
  onRemove: (index: number) => void;
}

export function NamedEffectsEditor({ effects, onUpdate, onRemove }: NamedEffectsEditorProps) {
  return (
    <>
      {effects.map(({ effect: e, index }) => (
        <div key={index} className="space-y-1">
          <div className="flex gap-2 items-center">
            <Input
              className="w-24"
              value={e.name ?? ''}
              onChange={(ev) => onUpdate(index, { name: ev.target.value })}
              placeholder="Label"
            />
            <Input
              className="w-16 text-center"
              value={e.cost ?? ''}
              onChange={(ev) => onUpdate(index, { cost: ev.target.value || undefined })}
              placeholder="Cost"
            />
            <div className="flex-1" />
            <button
              onClick={() => onRemove(index)}
              className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Remove effect"
              title="Remove effect"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <Textarea
            rows={2}
            value={e.effect ?? ''}
            onChange={(ev) => onUpdate(index, { effect: ev.target.value })}
            placeholder="Effect text"
          />
        </div>
      ))}
    </>
  );
}
