import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';

interface ConflictDialogProps {
  open: boolean;
  remoteModifiedTime: string | undefined;
  onUseRemote: () => void;
  onKeepLocal: () => void;
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return 'unknown';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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
            <div className="rounded-sm bg-surface-container-high p-2">
              <div className="font-label font-bold uppercase tracking-wide text-on-surface-variant">
                Your local edits
              </div>
            </div>
            <div className="rounded-sm bg-surface-container-high p-2">
              <div className="font-label font-bold uppercase tracking-wide text-on-surface-variant">
                Remote version
              </div>
              <div className="pt-1 text-on-surface">saved {formatTimestamp(remoteModifiedTime)}</div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onUseRemote}>Discard local, use remote</Button>
          <Button onClick={onKeepLocal}>Keep local, overwrite remote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
