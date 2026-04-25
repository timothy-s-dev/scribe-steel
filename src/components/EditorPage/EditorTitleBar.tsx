import { ArrowLeft } from 'lucide-react';
import { SaveStatusBadge } from '@/components/SaveStatusBadge';
import { pageTitle } from '@/data/documents/titles';
import type { DocumentMetadata } from '@/data/documents';
import type { DocumentMetaFields } from '@/data/documents/types';
import type { SaveStatus } from '@/hooks/useDocumentMutation';

interface EditorTitleBarProps<T extends DocumentMetaFields & { name: string }> {
  type: DocumentMetadata<T>;
  docName: string;
  isLoading: boolean;
  canSave: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  hideBackButton: boolean;
  onNavigateBack: () => void;
}

export function EditorTitleBar<T extends DocumentMetaFields & { name: string }>({
  type,
  docName,
  isLoading,
  canSave,
  saveStatus,
  lastSavedAt,
  hideBackButton,
  onNavigateBack,
}: EditorTitleBarProps<T>) {
  return (
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
      ) : canSave ? (
        <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />
      ) : null}
    </div>
  );
}
