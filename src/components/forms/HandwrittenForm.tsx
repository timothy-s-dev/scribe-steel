import { TypstEditor } from '@/components/TypstEditor';
import { Field, FormPanel, Input } from '@/components/forms/common';
import { type HandwrittenDocument } from '@/data/documents/handwritten';
import type { DocumentFormProps } from '@/data/documents/types';

export function HandwrittenForm({ value, onChange }: DocumentFormProps<HandwrittenDocument>) {
  return (
    <FormPanel className="md:w-1/2" bodyClassName="space-y-2">
      <Field label="Title">
        <Input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Title"
        />
      </Field>
      <TypstEditor
        value={value.content}
        onChange={(content) => onChange({ ...value, content })}
      />
    </FormPanel>
  );
}
