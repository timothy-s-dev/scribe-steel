import { useStorage } from '@/contexts/StorageContext';
import { CloudOff, X } from 'lucide-react';

export function SaveStatusBanner() {
  const { saveStatus, lastError, clearError } = useStorage();

  if (saveStatus !== 'error') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-sm bg-tertiary-container/90 text-tertiary p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <CloudOff size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body font-semibold">Save failed</p>
          <p className="text-xs font-label mt-1 opacity-80">
            {lastError || 'Unable to save to Google Drive. Back up your work locally.'}
          </p>
        </div>
        <button
          onClick={clearError}
          className="flex-shrink-0 p-0.5 hover:opacity-70 transition-opacity rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Dismiss error"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
