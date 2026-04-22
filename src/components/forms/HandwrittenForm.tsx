import { TypstEditor } from '@/components/TypstEditor';
import { type HandwrittenDocument } from '@/documents/handwritten';
import type { DocumentFormProps } from '@/documents/types';

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';
const optionalClass = 'text-outline/50 ml-1';

export function HandwrittenForm({ value, onChange }: DocumentFormProps<HandwrittenDocument>) {
  return (
    <div className="flex-1 min-w-0 md:w-1/2 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="flex-shrink-0 bg-surface-container px-4 py-3 space-y-2">
        <label className="block space-y-1">
          <span className={labelClass}>
            Title<span className={optionalClass}>(optional)</span>
          </span>
          <input
            className={inputClass}
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Title"
          />
        </label>
      </div>
      <TypstEditor
        value={value.content}
        onChange={(content) => onChange({ ...value, content })}
      />
    </div>
  );
}
