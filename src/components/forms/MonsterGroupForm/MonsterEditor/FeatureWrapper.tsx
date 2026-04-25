import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { Feature } from '@/data/bestiary';

interface FeatureWrapperProps {
  feature: Feature;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

export function FeatureWrapper({
  feature,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: FeatureWrapperProps) {
  const [collapsed, setCollapsed] = useState(!!feature.name);
  const label = feature.name || (feature.feature_type === 'ability' ? 'Unnamed Ability' : 'Unnamed Trait');
  const tag = feature.feature_type === 'ability' ? 'Ability' : 'Trait';

  return (
    <div className="rounded-sm bg-surface-container-low border border-outline-variant/20">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
        <span className="text-xs font-label font-bold text-on-surface truncate flex-1">
          {label}
        </span>
        <span className="text-[9px] font-label text-on-surface-variant/50 uppercase tracking-wide">
          {tag}
        </span>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-0.5 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-sm disabled:opacity-30 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Move up"
          title="Move up"
        >
          <ArrowUp size={14} aria-hidden="true" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-0.5 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-sm disabled:opacity-30 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Move down"
          title="Move down"
        >
          <ArrowDown size={14} aria-hidden="true" />
        </button>
        <button
          onClick={onRemove}
          className="p-0.5 text-on-surface-variant/50 hover:text-tertiary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`Remove ${label}`}
          title="Remove"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}
