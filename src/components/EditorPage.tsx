import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ConflictDialog } from '@/components/ConflictDialog';
import { DocumentPreview } from '@/components/preview';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave, type SaveStatus } from '@/hooks/useAutoSave';
import { useDocumentSync } from '@/hooks/useDocumentSync';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorLabel, listTitle, notFoundLabel, pageTitle } from '@/documents/titles';
import type { DocumentMetadata } from '@/documents';
import type { DocumentMetaFields } from '@/data/types';

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved';
    case 'error':
      return 'Save failed';
    default:
      return '';
  }
}

function stripMeta<T extends DocumentMetaFields>(d: T): Omit<T, 'updatedAt'> {
  const { updatedAt: _u, ...rest } = d;
  return rest;
}

type MobileTab = 'edit' | 'preview';

interface EditorPageProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  forceDemo?: boolean;
  hideBackButton?: boolean;
}

// Generic orchestrator for every editor page. Handles param parsing, document
// loading, save orchestration, conflict detection, and split form/preview
// layout with mobile tabs. Per-type behavior is entirely driven by the
// metadata descriptor.
export function EditorPage<T extends DocumentMetaFields & { name: string }>({
  type,
  forceDemo = false,
  hideBackButton = false,
}: EditorPageProps<T>) {
  usePageTitle(pageTitle(type));
  const navigate = useNavigate();
  const { fileId } = useParams<{ fileId: string }>();
  const isDemo = forceDemo || fileId === 'demo';
  const { data: loaded, isLoading: loading, error: loadError } = useDocument<T>(
    type.category,
    isDemo ? undefined : fileId,
    { enabled: !isDemo },
  );

  const { data: indexData } = useIndex(type.category, { enabled: !isDemo });

  const [saved, setSaved] = useState<T | null>(() =>
    isDemo ? type.createDefault('') : null,
  );
  const [resetKey, setResetKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');

  const docName = isDemo
    ? (saved?.name || 'Demo')
    : (saved?.name || indexData?.items.find((i) => i.fileId === fileId)?.name || '');

  const { triggerSave, flush, saveStatus } = useAutoSave({
    category: type.category,
    name: docName,
    fileId: isDemo ? null : (fileId ?? null),
    deriveIndexFields: type.indexFields
      ? (data) => type.indexFields!(data as T)
      : undefined,
    onSaved: (result) => sync.markSaved(result.data),
  });

  const sync = useDocumentSync<T>({
    loaded: isDemo ? undefined : loaded,
    currentLocal: saved,
    initialize: (next) => {
      setSaved(next);
      setResetKey((k) => k + 1);
    },
    isEqualToLocal: (next) => {
      if (!saved) return false;
      return JSON.stringify(stripMeta(next)) === JSON.stringify(stripMeta(saved));
    },
    getUpdatedAt: (s) => s.updatedAt,
    triggerSave,
    flush,
  });

  const handleChange = useCallback(
    (next: T) => {
      setSaved(next);
      if (isDemo || sync.conflict) return;
      triggerSave(next);
    },
    [isDemo, sync.conflict, triggerSave],
  );

  const hasPreview = !!type.buildSource;
  const error = loadError
    ? errorLabel(type)
    : !isDemo && !loaded && !loading
      ? notFoundLabel(type)
      : null;

  const formPanel = saved ? (
    <type.FormComponent key={resetKey} initialSaved={saved} onChange={handleChange} />
  ) : null;

  const previewPanel = hasPreview && saved ? (
    <DocumentPreview document={{ metadata: type, data: saved, fileId: fileId ?? '' }} />
  ) : null;

  const editorBody = hasPreview ? (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="md:hidden flex bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <TabButton active={mobileTab === 'edit'} onClick={() => setMobileTab('edit')}>Edit</TabButton>
        <TabButton active={mobileTab === 'preview'} onClick={() => setMobileTab('preview')}>Preview</TabButton>
      </div>
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {formPanel}
        {previewPanel}
      </div>
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        {mobileTab === 'edit' ? formPanel : previewPanel}
      </div>
    </div>
  ) : (
    formPanel
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={type.icon} title={type.sectionTitle ?? listTitle(type)} />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm font-body text-on-surface-variant">Loading...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm font-body text-tertiary">{error}</p>
          {!hideBackButton && (
            <button
              onClick={() => navigate('..', { relative: 'path' })}
              className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
            >
              Back to list
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
            {!hideBackButton && (
              <button
                onClick={() => navigate('..', { relative: 'path' })}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Back to list"
                title="Back to list"
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            )}
            <div className="text-sm font-semibold font-body text-on-surface truncate flex-1 min-w-0">
              {docName || pageTitle(type)}
            </div>
            {!isDemo && saveStatus && (
              <span className="text-xs font-label text-on-surface-variant/50">
                {saveStatusLabel(saveStatus)}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">{editorBody}</div>
        </>
      )}
      {!isDemo && (
        <ConflictDialog
          open={!!sync.conflict}
          localUpdatedAt={sync.conflict?.local}
          remoteUpdatedAt={sync.conflict?.remote}
          onUseRemote={sync.useRemote}
          onKeepLocal={sync.keepLocal}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-xs font-label font-bold tracking-wide text-center transition-colors ${
        active ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'
      }`}
    >
      {children}
    </button>
  );
}
