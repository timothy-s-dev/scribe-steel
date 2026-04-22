import { TypstEditor } from '@/components/TypstEditor';
import { Field, FormPanel, Input } from '@/components/form';
import { type HandwrittenDocument } from '@/documents/handwritten';
import type { DocumentFormProps } from '@/documents/types';

export function HandwrittenForm({ value, onChange }: DocumentFormProps<HandwrittenDocument>) {
  return (
    <FormPanel className="md:w-1/2">
      <div className="flex-shrink-0 bg-surface-container px-4 py-3 space-y-2">
        <Field label="Title">
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="Title"
          />
        </Field>
      </div>
      <div className="flex-1 min-h-[300px] flex flex-col overflow-hidden">
        <TypstEditor
          value={value.content}
          onChange={(content) => onChange({ ...value, content })}
        />
      </div>
    </FormPanel>
  );
}
