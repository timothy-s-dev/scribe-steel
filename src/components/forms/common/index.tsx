import { forwardRef } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compactLabelClass, inputBaseClass, inputSizeClass, type InputSize } from '@/components/forms/common/formStyles';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { inputSize?: InputSize };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <input ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props} />
  ),
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputSize?: InputSize };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, inputSize = 'md', ...props }, ref) => (
    <textarea ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { inputSize?: InputSize };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, inputSize = 'md', children, ...props }, ref) => (
    <select ref={ref} className={cn('w-full', inputBaseClass, inputSizeClass[inputSize], className)} {...props}>
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

// Shared shell for editor form panes. `className` targets the outer panel
// (width override); `bodyClassName` targets the scrollable body inside
// (padding, spacing, max-width). Header/footer are optional slots wrapped
// in shared bg-surface-container chrome.
export function FormPanel({
  className,
  bodyClassName,
  header,
  footer,
  children,
}: {
  className?: string;
  bodyClassName?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex-1 min-w-0 md:flex-none h-full flex flex-col overflow-hidden md:border-r border-outline-variant/20',
        className,
      )}
    >
      {header != null && (
        <div className="flex-shrink-0 flex items-center min-h-11 px-4 py-2 bg-surface-container">
          {header}
        </div>
      )}
      <div
        className={cn(
          'flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar px-4 py-3',
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer != null && (
        <div className="flex-shrink-0 px-4 py-3 bg-surface-container">{footer}</div>
      )}
    </div>
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
