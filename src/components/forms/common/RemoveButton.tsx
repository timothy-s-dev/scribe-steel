import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RemoveButton({
  onClick,
  label,
  compact,
  className,
}: {
  onClick: () => void;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-on-surface-variant/50 hover:text-tertiary transition-colors flex-shrink-0 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        compact ? 'p-0.5' : 'p-1',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <X size={compact ? 14 : 16} aria-hidden="true" />
    </button>
  );
}
