import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TypstEditor, type DocumentData } from '@/components/TypstEditor';
import { useStorage } from '@/contexts/StorageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import handwrittenTyp from '@/typst/templates/handwritten.typ?raw';
import type { TemplateSchema } from '@/typst/templateSchema';

const schema: TemplateSchema = {
  name: 'Handwritten Note',
  importPath: '/templates/handwritten.typ',
  functionName: 'handwritten',
  params: [
    { key: 'title', label: 'Title', type: 'string', optional: true },
  ],
  files: [
    { path: '/templates/handwritten.typ', content: handwrittenTyp },
  ],
};

interface SavedDocument {
  version: number;
  template: string;
  params: Record<string, string>;
  body: string;
}

export function LettersAndNotesEditorPage() {
  usePageTitle('Letter / Note');
  const { fileId } = useParams<{ fileId: string }>();
  const isNew = fileId === 'demo';
  const navigate = useNavigate();
  const { load, saveStatus } = useStorage();
  const { isSignedIn, isLoading: authLoading } = useAuth();
  const [doc, setDoc] = useState<SavedDocument | null>(
    isNew ? { version: 1, template: 'letters-and-notes', params: {}, body: '' } : null,
  );
  const [docName, setDocName] = useState(isNew ? 'Untitled' : '');
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const { triggerSave } = useAutoSave({
    category: 'letters-and-notes',
    name: docName,
    fileId: isNew ? null : (fileId ?? null),
  });

  // Load document from Drive (wait for auth to be ready)
  useEffect(() => {
    if (isNew || !fileId || authLoading) return;
    if (!isSignedIn) {
      setError('Sign in to load documents');
      setLoading(false);
      return;
    }
    setLoading(true);
    load<SavedDocument>(fileId).then((data) => {
      if (data) {
        setDoc(data);
      } else {
        setError('Failed to load document');
      }
      setLoading(false);
    });
  }, [fileId, isNew, load, isSignedIn, authLoading]);

  // Get the name from the index cache
  useEffect(() => {
    if (isNew) return;
    try {
      const raw = localStorage.getItem('scribe-steel-index-letters-and-notes');
      if (raw) {
        const index = JSON.parse(raw);
        const item = index.items?.find((i: { fileId: string }) => i.fileId === fileId);
        if (item) setDocName(item.name);
      }
    } catch { /* ignore */ }
  }, [fileId, isNew]);

  const handleChange = useCallback(
    (data: DocumentData) => {
      const saveData: SavedDocument = {
        version: 1,
        template: 'letters-and-notes',
        params: data.params,
        body: data.body,
      };
      triggerSave(saveData);
    },
    [triggerSave],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm font-body text-on-surface-variant">Loading document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-sm font-body text-tertiary">{error || 'Document not found'}</p>
        <button
          onClick={() => navigate('/letters-and-notes')}
          className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Doc header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <button
          onClick={() => navigate('/letters-and-notes')}
          className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Back to list"
          title="Back to list"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
        </button>
        <span className="text-sm font-body font-semibold text-on-surface truncate">
          {docName}
        </span>
        <span className="text-xs font-label text-on-surface-variant/50 ml-auto">
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'error'
                ? 'Save failed'
                : ''}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <TypstEditor
          schema={schema}
          initialContent={doc.body}
          initialParams={doc.params}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
