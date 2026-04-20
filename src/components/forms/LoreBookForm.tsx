import { useEffect, useRef, useState } from 'react';
import { TypstEditor } from '@/components/TypstEditor';
import { type LoreBookDocument } from '@/documents/lore-books';

const inputClass = 'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'text-xs font-label text-on-surface-variant';
const optionalClass = 'text-outline/50 ml-1';

interface LoreBookFormProps {
  initialSaved: LoreBookDocument;
  onChange: (saved: LoreBookDocument) => void;
}

export function LoreBookForm({ initialSaved, onChange }: LoreBookFormProps) {
  const [saved, setSaved] = useState<LoreBookDocument>(initialSaved);

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

  const set = <K extends keyof LoreBookDocument>(key: K, value: LoreBookDocument[K]) =>
    setSaved((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex-1 min-w-0 md:w-1/2 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="flex-shrink-0 bg-surface-container px-4 py-3 space-y-2 overflow-y-auto custom-scrollbar max-h-[50%]">
        <label className="block space-y-1">
          <span className={labelClass}>Title</span>
          <input
            className={inputClass}
            value={saved.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Title"
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>
            Category<span className={optionalClass}>(optional)</span>
          </span>
          <input
            className={inputClass}
            value={saved.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="Category"
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>
            Epigraph<span className={optionalClass}>(optional)</span>
          </span>
          <textarea
            className={inputClass}
            rows={2}
            value={saved.epigraph}
            onChange={(e) => set('epigraph', e.target.value)}
            placeholder="Epigraph"
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>
            Epigraph Attribution<span className={optionalClass}>(optional)</span>
          </span>
          <input
            className={inputClass}
            value={saved.epigraphAttribution}
            onChange={(e) => set('epigraphAttribution', e.target.value)}
            placeholder="Epigraph Attribution"
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>
            Description<span className={optionalClass}>(optional)</span>
          </span>
          <textarea
            className={inputClass}
            rows={2}
            value={saved.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Description"
          />
        </label>
      </div>
      <TypstEditor value={saved.content} onChange={(content) => set('content', content)} />
    </div>
  );
}
