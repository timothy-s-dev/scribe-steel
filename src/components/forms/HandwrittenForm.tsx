import { useEffect, useRef, useState } from 'react';
import { TypstEditor } from '@/components/TypstEditor';
import { TemplateParamsForm } from '@/components/TemplateParamsForm';
import { handwrittenSchema, type HandwrittenDocument } from '@/documents/handwritten';

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';

interface HandwrittenFormProps {
  initialSaved: HandwrittenDocument;
  onChange: (saved: HandwrittenDocument) => void;
}

export function HandwrittenForm({ initialSaved, onChange }: HandwrittenFormProps) {
  const [saved, setSaved] = useState<HandwrittenDocument>(initialSaved);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const firstEmitRef = useRef(true);

  useEffect(() => {
    if (firstEmitRef.current) {
      firstEmitRef.current = false;
      return;
    }
    onChangeRef.current(saved);
  }, [saved]);

  const setName = (name: string) => setSaved((prev) => ({ ...prev, name }));
  const setBody = (body: string) => setSaved((prev) => ({ ...prev, body }));
  const setParam = (key: string, value: string) =>
    setSaved((prev) => ({ ...prev, params: { ...prev.params, [key]: value } }));

  return (
    <div className="flex-1 min-w-0 md:w-1/2 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="px-4 py-3 bg-surface-container flex-shrink-0">
        <label className="block space-y-1">
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            value={saved.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Handwritten document name"
          />
        </label>
      </div>
      <TemplateParamsForm
        params={handwrittenSchema.params ?? []}
        values={saved.params}
        onChange={setParam}
      />
      <TypstEditor value={saved.body} onChange={setBody} />
    </div>
  );
}
