import { useCallback, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ConflictDialog } from '@/components/ConflictDialog';
import { DocumentPreview } from '@/components/preview';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useAutoSave, type SaveStatus } from '@/hooks/useAutoSave';
import { usePageTitle } from '@/hooks/usePageTitle';
import { errorLabel, listTitle, notFoundLabel, pageTitle } from '@/documents/titles';
import type { DocumentMetadata } from '@/documents';
import type { Category, DocumentMetaFields } from '@/data/types';

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

type MobileTab = 'edit' | 'preview';

interface EditorPageProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  forceDemo?: boolean;
  hideBackButton?: boolean;
}

// Outer orchestrator: handles routing, loading state, and error state.
// The actual edit UI lives in <DocumentEditor>, which is remounted (via
// `key`) when the document's identity changes — that's how we initialize
// local state from async-loaded data without a setState-in-effect mirror.
export function EditorPage<T extends DocumentMetaFields & { name: string }>({
  type,
  forceDemo = false,
  hideBackButton = false,
}: EditorPageProps<T>) {
  usePageTitle(pageTitle(type));
  const navigate = useNavigate();
  const { fileId } = useParams<{ fileId: string }>();
  const isDemo = forceDemo || fileId === 'demo';
  const { data: remote, isLoading: loading, error: loadError } = useDocument<T>(
    type.category,
    isDemo ? undefined : fileId,
    { enabled: !isDemo },
  );

  const { data: indexData } = useIndex(type.category, { enabled: !isDemo });

  const error = loadError
    ? errorLabel(type)
    : !isDemo && !remote && !loading
      ? notFoundLabel(type)
      : null;

  // Placeholder used while the doc is still loading; the editor renders
  // disabled in this state, so the user never interacts with these values.
  const initial: T = isDemo
    ? type.createDefault('')
    : remote?.data ?? type.createDefault('');

  // Key changes between loading → loaded, which remounts DocumentEditor
  // with the real `initial` value via useState's normal semantics.
  const editorKey = isDemo
    ? 'demo'
    : remote
      ? `${fileId}:loaded`
      : `${fileId}:loading`;

  const isLoading = !isDemo && !remote && !error;
  const indexName = !isDemo
    ? indexData?.items.find((i) => i.fileId === fileId)?.name
    : undefined;

  const handleNavigateBack = useCallback(
    () => navigate('..', { relative: 'path' }),
    [navigate],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={type.icon} title={type.sectionTitle ?? listTitle(type)} />
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm font-body text-tertiary">{error}</p>
          {!hideBackButton && (
            <button
              onClick={handleNavigateBack}
              className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
            >
              Back to list
            </button>
          )}
        </div>
      ) : (
        <DocumentEditor
          key={editorKey}
          type={type}
          fileId={fileId ?? null}
          isDemo={isDemo}
          hideBackButton={hideBackButton}
          initial={initial}
          initialDocName={indexName}
          isLoading={isLoading}
          onNavigateBack={handleNavigateBack}
        />
      )}
    </div>
  );
}

interface DocumentEditorProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  fileId: string | null;
  isDemo: boolean;
  hideBackButton: boolean;
  initial: T;
  initialDocName: string | undefined;
  isLoading: boolean;
  onNavigateBack: () => void;
}

// Inner component: owns the working copy and save orchestration. Always
// remounted when the document identity changes (loading → loaded, or
// switching docs), so `useState(initial)` reliably picks up the right
// starting value without any effect-based mirroring.
function DocumentEditor<T extends DocumentMetaFields & { name: string }>({
  type,
  fileId,
  isDemo,
  hideBackButton,
  initial,
  initialDocName,
  isLoading,
  onNavigateBack,
}: DocumentEditorProps<T>) {
  const queryClient = useQueryClient();
  const [workingCopy, setWorkingCopy] = useState<T>(initial);
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  // Bumping `formKey` remounts the form, so adopting a new workingCopy
  // (e.g. after "use remote") visually resets the form to the new values.
  const [formKey, setFormKey] = useState(0);

  const docName = isDemo
    ? (workingCopy.name || 'Demo')
    : (workingCopy.name || initialDocName || '');

  // Memoize the two callbacks passed to useAutoSave — the hook lists them
  // in its internal effect deps, so churning identities would rebuild the
  // save pipeline on every render.
  const deriveIndexFields = useCallback(
    (data: T): Record<string, unknown> => type.indexFields?.(data) ?? {},
    [type],
  );
  const getUpdatedAt = useCallback((d: T) => d.updatedAt, []);

  const autoSave = useAutoSave<T>({
    category: type.category,
    name: docName,
    fileId: isDemo ? null : fileId,
    deriveIndexFields,
    getUpdatedAt,
  });

  // These callbacks don't need useCallback — the form uses `useEmitOnChange`
  // to dedupe by content, so parent callback identity flipping doesn't
  // cause spurious saves. ConflictDialog isn't memoized either. Keep it
  // plain so we don't have to track deps across autoSave's object identity.
  const handleChange = (next: T) => {
    setWorkingCopy(next);
    if (isDemo || isLoading || autoSave.conflict) return;
    autoSave.triggerSave(next);
  };

  // Conflict resolution workflows live here, not in the hook — the hook
  // just reports the conflict; composing the "accept remote" vs "keep
  // local" sequences is a UI concern.
  const handleUseRemote = () => {
    if (!autoSave.conflict) return;
    const { remoteData, remoteVersion } = autoSave.conflict;
    setWorkingCopy(remoteData as T);
    // Sync the cache so subsequent saves see the new version as current.
    if (fileId !== null) {
      queryClient.setQueryData(
        [type.category as Category, 'document', fileId],
        { data: remoteData, version: remoteVersion },
      );
    }
    setFormKey((k) => k + 1);
    autoSave.clearConflict();
  };

  const handleKeepLocal = () => {
    if (!autoSave.conflict) return;
    const { remoteVersion } = autoSave.conflict;
    // Bump the cached version to the one we just learned is current
    // server-side, so runSave's next read sees itself as up-to-date.
    if (fileId !== null) {
      queryClient.setQueryData<{ data: T; version: number }>(
        [type.category as Category, 'document', fileId],
        (prev) => (prev ? { ...prev, version: remoteVersion } : prev),
      );
    }
    autoSave.clearConflict();
    autoSave.triggerSave(workingCopy);
  };

  const hasPreview = !!type.buildSource;

  // `contents` makes the wrapper transparent to flex layout, so the form's
  // own outer div keeps its flex-child styling. During loading we dim and
  // disable via the direct-child variant — pointer-events / opacity don't
  // apply to a display:contents element itself.
  const formPanelWrapperClass = isLoading
    ? 'contents [&>*]:pointer-events-none [&>*]:opacity-50'
    : 'contents';
  const formPanel = (
    <div className={formPanelWrapperClass}>
      <type.FormComponent key={formKey} initialSaved={workingCopy} onChange={handleChange} />
    </div>
  );

  const previewPanel = hasPreview ? (
    <DocumentPreview document={{ metadata: type, data: workingCopy, fileId: fileId ?? '' }} />
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

  const statusText = isLoading
    ? 'Loading...'
    : !isDemo
      ? saveStatusLabel(autoSave.saveStatus)
      : '';

  return (
    <>
      <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        {!hideBackButton && (
          <button
            onClick={onNavigateBack}
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
        {statusText && (
          <span className="text-xs font-label text-on-surface-variant/50">
            {statusText}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{editorBody}</div>
      {!isDemo && (
        <ConflictDialog
          open={!!autoSave.conflict}
          localUpdatedAt={autoSave.conflict?.localUpdatedAt}
          remoteUpdatedAt={autoSave.conflict?.remoteUpdatedAt}
          onUseRemote={handleUseRemote}
          onKeepLocal={handleKeepLocal}
        />
      )}
    </>
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
