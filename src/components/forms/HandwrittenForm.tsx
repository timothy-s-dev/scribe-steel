import { TypstEditor } from '@/components/TypstEditor';
import { Field, Input } from '@/components/form';
import { type HandwrittenDocument } from '@/documents/handwritten';
import type { DocumentFormProps } from '@/documents/types';

export function HandwrittenForm({ value, onChange }: DocumentFormProps<HandwrittenDocument>) {
  return (
    <div className="flex-1 min-w-0 md:w-1/2 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="flex-shrink-0 bg-surface-container px-4 py-3 space-y-2">
        <Field label="Title">
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Title"
          />
        </Field>
      </div>
      <TypstEditor
        value={value.content}
        onChange={(content) => onChange({ ...value, content })}
      />
    </div>
  );
}
