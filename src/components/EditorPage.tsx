import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CloudOff } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ConflictDialog } from '@/components/ConflictDialog';
import { SaveRetryBanner } from '@/components/SaveRetryBanner';
import { SaveStatusBadge } from '@/components/SaveStatusBadge';
import { SignInButton } from '@/components/SignInButton';
import { DocumentPreview } from '@/components/preview';
import { useAuth } from '@/contexts/AuthContext';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useDocumentMutation } from '@/hooks/useDocumentMutation';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  errorLabel,
  listTitle,
  notFoundLabel,
  pageTitle,
  signInToViewLabel,
} from '@/documents/titles';
import { DriveError } from '@/services/google-drive';
import type { DocumentMetadata } from '@/documents';
import type { DocumentMetaFields } from '@/data/types';

type MobileTab = 'edit' | 'preview';

interface EditorPageProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  forceDemo?: boolean;
  hideBackButton?: boolean;
}

// Outer shell: routes the URL param through to a DocumentEditor keyed on
// the file identity, so switching docs cleanly drops any internal state.
export function EditorPage<T extends DocumentMetaFields & { name: string }>({
  type,
  forceDemo = false,
  hideBackButton = false,
}: EditorPageProps<T>) {
  usePageTitle(pageTitle(type));
  const navigate = useNavigate();
  const { fileId } = useParams<{ fileId: string }>();
  const effectiveId = forceDemo ? 'demo' : (fileId ?? 'demo');

  const handleNavigateBack = useCallback(
    () => navigate('..', { relative: 'path' }),
    [navigate],
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={type.icon} title={type.sectionTitle ?? listTitle(type)} />
      <DocumentEditor
        key={effectiveId}
        type={type}
        fileId={effectiveId}
        hideBackButton={hideBackButton}
        onNavigateBack={handleNavigateBack}
      />
    </div>
  );
}

interface DocumentEditorProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  fileId: string;
  hideBackButton: boolean;
  onNavigateBack: () => void;
}

// Cache-first editor. The TanStack Query cache holds the canonical in-flight
// document; the form and preview both subscribe to it, and edits land in
// the cache synchronously via useDocumentMutation before the debounced save
// ever talks to Drive. Demo docs flow through the same path — the query
// layer synthesizes a default envelope, and the mutation layer no-ops the
// network save.
function DocumentEditor<T extends DocumentMetaFields & { name: string }>({
  type,
  fileId,
  hideBackButton,
  onNavigateBack,
}: DocumentEditorProps<T>) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  // Bumped when the user discards local edits in favor of remote. Forms
  // that derive UI-scratch state from `value` on mount (e.g. row ids in
  // EncounterForm) remount to pick up the fresh data.
  const [formResetToken, setFormResetToken] = useState(0);

  const { isSignedIn, isLoading: authLoading } = useAuth();
  const isDemo = fileId === 'demo';
  const needsSignIn = !isDemo && !authLoading && !isSignedIn;

  const { data: envelope, isLoading, error: loadError } = useDocument<T>(type.category, fileId, {
    enabled: !needsSignIn,
  });
  const { data: indexData } = useIndex(type.category, { enabled: !isDemo && isSignedIn });

  const deriveIndexFields = useCallback(
    (data: T): Record<string, unknown> => type.indexFields?.(data) ?? {},
    [type],
  );

  const mutation = useDocumentMutation<T>({
    category: type.category,
    fileId,
    deriveIndexFields,
  });

  const handleUseRemote = useCallback(() => {
    mutation.resolveUseRemote();
    setFormResetToken((t) => t + 1);
  }, [mutation]);

  if (needsSignIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <CloudOff size={48} className="text-on-surface-variant/30" aria-hidden="true" />
        <p className="text-sm font-body text-on-surface-variant">
          {signInToViewLabel(type)}
        </p>
        <SignInButton />
      </div>
    );
  }

  const is404 = loadError instanceof DriveError && loadError.status === 404;
  const errorMessage = is404
    ? notFoundLabel(type)
    : loadError
      ? errorLabel(type)
      : !envelope && !isLoading
        ? notFoundLabel(type)
        : null;

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-sm font-body text-tertiary">{errorMessage}</p>
        {!hideBackButton && (
          <button
            onClick={onNavigateBack}
            className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
          >
            Back to list
          </button>
        )}
      </div>
    );
  }

  const data = envelope?.data;
  const indexName = !isDemo
    ? indexData?.items.find((i) => i.fileId === fileId)?.name
    : undefined;
  const docName = isDemo
    ? (data?.name || 'Demo')
    : (data?.name || indexName || '');

  const hasPreview = !!type.buildSource;
  const FormComponent = type.FormComponent;

  // While loading, dim and disable the form. `contents` keeps the wrapper
  // transparent to the surrounding flex layout so the form's own flex
  // sizing still applies.
  const formPanelWrapperClass = isLoading
    ? 'contents [&>*]:pointer-events-none [&>*]:opacity-50'
    : 'contents';
  const formPanel = data ? (
    <div className={formPanelWrapperClass}>
      <FormComponent key={formResetToken} value={data} onChange={mutation.edit} />
    </div>
  ) : null;

  const previewPanel = hasPreview && data ? (
    <DocumentPreview document={{ metadata: type, data, fileId }} />
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
        {isLoading ? (
          <span className="text-xs font-label text-on-surface-variant/50">Loading...</span>
        ) : !isDemo ? (
          <SaveStatusBadge
            status={mutation.saveStatus}
            lastSavedAt={mutation.lastSavedAt}
          />
        ) : null}
      </div>
      {!isDemo && <SaveRetryBanner retry={mutation.retry} />}
      <div className="flex-1 min-h-0 overflow-hidden">{editorBody}</div>
      {!isDemo && (
        <ConflictDialog
          open={!!mutation.conflict}
          remoteModifiedTime={mutation.conflict?.remoteModifiedTime}
          onUseRemote={handleUseRemote}
          onKeepLocal={mutation.resolveKeepLocal}
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
