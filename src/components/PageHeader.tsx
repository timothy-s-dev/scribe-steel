import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

export function PageHeader({ icon: Icon, title, action }: PageHeaderProps) {
  return (
    <div className="relative z-10 flex items-center justify-between px-6 py-4 bg-surface-container flex-shrink-0">
      <div className="flex items-center gap-3">
        <Icon size={20} className="text-on-surface-variant" aria-hidden="true" />
        <h1 className="text-lg font-headline font-semibold text-on-surface">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
