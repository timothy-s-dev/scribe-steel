import { cn } from '@/lib/utils';

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
