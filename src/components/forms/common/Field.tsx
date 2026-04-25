import { cn } from '@/lib/utils';
import { compactLabelClass } from './formStyles';

export function Field({
  label,
  required,
  compact,
  labelClassName,
  className,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  compact?: boolean;
  labelClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span
        className={cn(
          compact
            ? compactLabelClass
            : 'text-xs font-label text-on-surface-variant',
          labelClassName,
        )}
      >
        {label}
        {!required && !compact && (
          <span className="text-outline/50 ml-1" aria-hidden="true">
            (optional)
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
