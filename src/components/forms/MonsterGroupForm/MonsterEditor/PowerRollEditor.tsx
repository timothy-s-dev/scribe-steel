import { Input } from '@/components/forms/common';
import { compactLabelClass, inputBaseClass, inputSizeClass } from '@/components/forms/common/formStyles';
import { cn } from '@/lib/utils';
import type { Effect } from '@/data/bestiary';

// Same visual treatment as an input, but non-editable — used for the static
// tier-range labels next to each result field.
const inputLikeBoxClass = cn(inputBaseClass, inputSizeClass.md);

interface PowerRollEditorProps {
  effect: Effect;
  onUpdate: (patch: Partial<Effect>) => void;
  onRemove: () => void;
}

export function PowerRollEditor({ effect, onUpdate, onRemove }: PowerRollEditorProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className={compactLabelClass}>Power Roll</div>
        <button
          onClick={onRemove}
          className="text-[10px] font-label text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <div>
          <div className={compactLabelClass}>Bonus</div>
          <Input
            type="number"
            className="text-center"
            value={effect.roll ?? 0}
            onChange={(e) => onUpdate({ roll: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div />
      </div>
      {(['tier1', 'tier2', 'tier3'] as const).map((tier, i) => (
        <div key={tier} className="grid grid-cols-[80px_1fr] gap-2">
          <span className={cn(inputLikeBoxClass, 'text-center text-xs flex items-center justify-center')}>
            {i === 0 ? '≤11' : i === 1 ? '12-16' : '17+'}
          </span>
          <Input
            value={effect[tier] ?? ''}
            onChange={(e) => onUpdate({ [tier]: e.target.value })}
            placeholder="Result"
          />
        </div>
      ))}
    </div>
  );
}
