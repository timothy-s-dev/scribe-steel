import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface Tool {
  label: string;
  icon: LucideIcon;
  to: string;
  description: ReactNode;
}

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <div className="group bg-surface-container-low rounded-md p-8 flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Icon size={28} className="text-primary" aria-hidden="true" />
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>
      <h4 className="font-headline text-xl mb-2 text-on-surface">
        {tool.label}
      </h4>
      <p className="text-sm text-outline leading-relaxed flex-1">
        {tool.description}
      </p>
      <Link
        to={tool.to}
        className="mt-6 text-secondary font-label text-sm font-bold tracking-widest uppercase flex items-center gap-2 hover:gap-3 transition-all no-underline"
      >
        Open
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
