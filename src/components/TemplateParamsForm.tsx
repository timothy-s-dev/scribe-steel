import { useState } from 'react';
import type { ParamsFormProps } from '@/typst/templateSchema';

export function TemplateParamsForm({ params, values, onChange }: ParamsFormProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (params.length === 0) return null;

  return (
    <div className="bg-surface-container flex-shrink-0">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-label text-on-surface-variant hover:text-primary transition-colors"
      >
        <span
          className="material-symbols-outlined text-sm transition-transform"
          style={{ transform: collapsed ? 'rotate(-90deg)' : '' }}
        >
          expand_more
        </span>
        Template Settings
      </button>
      {!collapsed && (
        <div className="px-4 pb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-start">
          {params.map((param) => (
            <label key={param.key} className="contents">
              <span className="text-xs font-label text-on-surface-variant pt-1.5">
                {param.label}
                {param.optional && (
                  <span className="text-outline/50 ml-1">(optional)</span>
                )}
              </span>
              {param.type === 'content' ? (
                <textarea
                  value={values[param.key] ?? param.default ?? ''}
                  onChange={(e) => onChange(param.key, e.target.value)}
                  rows={2}
                  className="bg-surface-container-high text-on-surface text-sm font-body px-2.5 py-1.5 rounded-sm resize-y outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder={param.label}
                />
              ) : (
                <input
                  type="text"
                  value={values[param.key] ?? param.default ?? ''}
                  onChange={(e) => onChange(param.key, e.target.value)}
                  className="bg-surface-container-high text-on-surface text-sm font-body px-2.5 py-1.5 rounded-sm outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder={param.label}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
