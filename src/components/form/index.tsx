import { forwardRef } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseInput =
  'w-full bg-surface-container-high text-on-surface text-sm font-body rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

const sizes = {
  md: 'px-2 py-1.5',
  sm: 'px-1.5 py-1',
} as const;

type Size = keyof typeof sizes;

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { inputSize?: Size };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <input ref={ref} className={cn(baseInput, sizes[inputSize], className)} {...props} />
  ),
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputSize?: Size };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <textarea ref={ref} className={cn(baseInput, sizes[inputSize], className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { inputSize?: Size };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, inputSize = 'md', children, ...props }, ref) => (
    <select ref={ref} className={cn(baseInput, sizes[inputSize], className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

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
            ? 'text-[10px] font-label text-on-surface-variant/70'
            : 'text-xs font-label text-on-surface-variant',
          labelClassName,
        )}
      >
        {label}
        {required ? null : <span className="text-outline/50 ml-1">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
      {children}
    </h3>
  );
}

export function AddButton({
  onClick,
  children,
  icon: Icon = Plus,
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon?: typeof Plus;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs font-label text-primary hover:text-primary/80 transition-colors cursor-pointer"
    >
      <Icon size={14} aria-hidden="true" />
      {children}
    </button>
  );
}

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
