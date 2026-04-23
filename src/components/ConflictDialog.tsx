import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Cloud, Pencil } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relativeTime';

interface ConflictDialogProps {
  open: boolean;
  remoteModifiedTime: string | undefined;
  onUseRemote: () => void;
  onKeepLocal: () => void;
}

export function ConflictDialog({
  open,
  remoteModifiedTime,
  onUseRemote,
  onKeepLocal,
}: ConflictDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document changed elsewhere</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-on-surface-variant">
            A newer version of this document is on Drive. Your local edits have not been
            saved yet. Choose which version to keep.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <button
              type="button"
              onClick={onKeepLocal}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-sm bg-surface-container-high p-4 text-center ring-1 ring-transparent transition-colors hover:bg-surface-container-highest hover:ring-primary focus-visible:ring-primary focus-visible:outline-none"
            >
              <Pencil className="size-12 text-on-surface-variant" />
              <div className="font-label font-bold uppercase tracking-wide text-on-surface-variant">
                Keep local
              </div>
              <div className="text-on-surface">Current Session &middot; Unsaved</div>
            </button>
            <button
              type="button"
              onClick={onUseRemote}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-sm bg-surface-container-high p-4 text-center ring-1 ring-transparent transition-colors hover:bg-surface-container-highest hover:ring-primary focus-visible:ring-primary focus-visible:outline-none"
            >
              <Cloud className="size-12 text-on-surface-variant" />
              <div className="font-label font-bold uppercase tracking-wide text-on-surface-variant">
                Use remote
              </div>
              <div className="text-on-surface">Last saved {formatRelativeTime(remoteModifiedTime)}</div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
