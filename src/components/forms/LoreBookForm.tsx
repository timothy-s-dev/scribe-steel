import { TypstEditor } from '@/components/TypstEditor';
import { Field, FormPanel, Input, Textarea } from '@/components/forms/common';
import { type LoreBookDocument } from '@/data/documents/lore-books';
import type { DocumentFormProps } from '@/data/documents/types';

export function LoreBookForm({ value, onChange }: DocumentFormProps<LoreBookDocument>) {
  return (
    <FormPanel className="md:w-1/2" bodyClassName="space-y-2">
      <Field label="Title" required>
        <Input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="Title"
        />
      </Field>
      <Field label="Category">
        <Input
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          placeholder="Category"
        />
      </Field>
      <Field label="Epigraph">
        <Textarea
          rows={2}
          value={value.epigraph}
          onChange={(e) => onChange({ ...value, epigraph: e.target.value })}
          placeholder="Epigraph"
        />
      </Field>
      <Field label="Epigraph Attribution">
        <Input
          value={value.epigraphAttribution}
          onChange={(e) => onChange({ ...value, epigraphAttribution: e.target.value })}
          placeholder="Epigraph Attribution"
        />
      </Field>
      <Field label="Description">
        <Textarea
          rows={2}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Description"
        />
      </Field>
      <TypstEditor value={value.content} onChange={(content) => onChange({ ...value, content })} />
    </FormPanel>
  );
}
