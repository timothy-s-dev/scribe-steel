import { useEffect, useRef, useState } from 'react';
import { TypstEditor } from '@/components/TypstEditor';
import { type HandwrittenDocument } from '@/documents/handwritten';

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';
const optionalClass = 'text-outline/50 ml-1';

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

  const set = <K extends keyof HandwrittenDocument>(key: K, value: HandwrittenDocument[K]) =>
    setSaved((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex-1 min-w-0 md:w-1/2 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="flex-shrink-0 bg-surface-container px-4 py-3 space-y-2">
        <label className="block space-y-1">
          <span className={labelClass}>
            Title<span className={optionalClass}>(optional)</span>
          </span>
          <input
            className={inputClass}
            value={saved.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Title"
          />
        </label>
      </div>
      <TypstEditor value={saved.content} onChange={(content) => set('content', content)} />
    </div>
  );
}
