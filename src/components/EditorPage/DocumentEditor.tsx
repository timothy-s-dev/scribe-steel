import { useCallback, useState } from 'react';
import { ConflictDialog } from '@/components/ConflictDialog';
import { SaveRetryBanner } from '@/components/SaveRetryBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { useDocumentMutation } from '@/hooks/useDocumentMutation';
import { errorLabel, notFoundLabel } from '@/documents/titles';
import { DriveError } from '@/services/google-drive';
import type { DocumentMetadata } from '@/documents';
import type { DocumentMetaFields } from '@/data/types';
import { EditorBody } from './EditorBody';
import { EditorErrorState } from './EditorErrorState';
import { EditorTitleBar } from './EditorTitleBar';
import { SignInGate } from './SignInGate';

interface DocumentEditorProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  fileId: string;
  hideBackButton: boolean;
  onNavigateBack: () => void;
}

// Cache-first editor. The TanStack Query cache holds the canonical
// in-flight document; the form and preview both subscribe to it, and
// edits land in the cache synchronously via useDocumentMutation before
// the debounced save ever talks to Drive. Non-persistent docs (virtual
// demo, static bestiary entries) flow through the same path — the query
// layer synthesizes or loads their envelope with a `source` tag, and the
// mutation layer no-ops the network save for non-Drive sources.
export function DocumentEditor<T extends DocumentMetaFields & { name: string }>({
  type,
  fileId,
  hideBackButton,
  onNavigateBack,
}: DocumentEditorProps<T>) {
  // Bumped when the user discards local edits in favor of remote. Forms
  // that derive UI-scratch state from `value` on mount (e.g. row ids in
  // EncounterForm) remount to pick up the fresh data.
  const [formResetToken, setFormResetToken] = useState(0);

  const { isSignedIn, isLoading: authLoading } = useAuth();
  // Only 'demo' doesn't require sign-in up front. Everything else may be
  // a real Drive doc or a static bestiary entry; we find out which after
  // the load resolves and the envelope's `source` tag tells us.
  const isDemoId = fileId === 'demo';
  const needsSignIn = !isDemoId && !authLoading && !isSignedIn;

  const { data: envelope, isLoading, error: loadError } = useDocument<T>(type.category, fileId, {
    enabled: !needsSignIn,
  });

  const source = envelope?.source;
  const canSave = source === 'drive';
  const isVirtual = source === 'virtual';

  const { data: indexData } = useIndex(type.category, { enabled: !isVirtual && isSignedIn });

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
    return <SignInGate type={type} />;
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
      <EditorErrorState
        message={errorMessage}
        hideBackButton={hideBackButton}
        onNavigateBack={onNavigateBack}
      />
    );
  }

  const data = envelope?.data;
  const indexName = !isVirtual
    ? indexData?.items.find((i) => i.fileId === fileId)?.name
    : undefined;
  const docName = isVirtual
    ? (data?.name || 'Demo')
    : (data?.name || indexName || '');

  return (
    <>
      <EditorTitleBar
        type={type}
        docName={docName}
        isLoading={isLoading}
        canSave={canSave}
        saveStatus={mutation.saveStatus}
        lastSavedAt={mutation.lastSavedAt}
        hideBackButton={hideBackButton}
        onNavigateBack={onNavigateBack}
      />
      {canSave && <SaveRetryBanner retry={mutation.retry} />}
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorBody
          type={type}
          data={data}
          fileId={fileId}
          isLoading={isLoading}
          formResetToken={formResetToken}
          onEdit={mutation.edit}
        />
      </div>
      {canSave && (
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
