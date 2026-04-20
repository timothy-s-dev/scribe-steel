import { useNavigate } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutoSave';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConflictDialog } from '@/components/ConflictDialog';
import type { DocumentSyncResult } from '@/hooks/useDocumentSync';

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

interface MetadataChrome {
  icon: LucideIcon;
  listTitle: string;
}

interface EditorPageProps {
  loading: boolean;
  error: string | null;
  notFoundLabel?: string;
  metadata: MetadataChrome;
  title: ReactNode;
  saveStatus?: SaveStatus;
  sync?: DocumentSyncResult;
  children: ReactNode;
}

// Shared chrome for document editor pages: parent-page breadcrumb, loading /
// error states, back button, document title, save status, and conflict
// resolution. Keeps the 4 editor pages from re-implementing the same layout.
export function EditorPage({
  loading,
  error,
  notFoundLabel = 'Document not found',
  metadata,
  title,
  saveStatus,
  sync,
  children,
}: EditorPageProps) {
  const navigate = useNavigate();

  const body = loading ? (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm font-body text-on-surface-variant">Loading...</p>
    </div>
  ) : error ? (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-sm font-body text-tertiary">{error || notFoundLabel}</p>
      <button
        onClick={() => navigate('..', { relative: 'path' })}
        className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
      >
        Back to list
      </button>
    </div>
  ) : (
    <>
      <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <button
          onClick={() => navigate('..', { relative: 'path' })}
          className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Back to list"
          title="Back to list"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="text-sm font-semibold font-body text-on-surface truncate flex-1 min-w-0">
          {title}
        </div>
        {saveStatus && (
          <span className="text-xs font-label text-on-surface-variant/50">
            {saveStatusLabel(saveStatus)}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader icon={metadata.icon} title={metadata.listTitle} />
      {body}
      {sync && (
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
