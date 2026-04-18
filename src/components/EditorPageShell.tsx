import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutoSave';
import type { ReactNode } from 'react';

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

interface EditorPageShellProps {
  loading: boolean;
  error: string | null;
  notFoundLabel?: string;
  backTo: string;
  title: ReactNode;
  saveStatus?: SaveStatus;
  children: ReactNode;
}

// Shared chrome for document editor pages: loading/error states, back button,
// title, and save status. Keeps the 4 editor pages from re-implementing the same
// layout and makes the save-status placement consistent.
export function EditorPageShell({
  loading,
  error,
  notFoundLabel = 'Document not found',
  backTo,
  title,
  saveStatus,
  children,
}: EditorPageShellProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm font-body text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-sm font-body text-tertiary">{error || notFoundLabel}</p>
        <button
          onClick={() => navigate(backTo)}
          className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="relative z-10 flex items-center gap-3 px-4 py-2 bg-surface-container flex-shrink-0 border-b border-outline-variant/20">
        <button
          onClick={() => navigate(backTo)}
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
    </div>
  );
}
