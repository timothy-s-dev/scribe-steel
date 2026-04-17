import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIndex } from '@/hooks/queries/useIndex';
import { useSaveDocument } from '@/hooks/queries/useDocument';
import type { Category } from '@/data/types';
import { Plus, CloudOff, FileText, ChevronRight, type LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreatingOverlay } from '@/components/CreatingOverlay';

interface DocumentListProps {
  category: Category;
  basePath: string;
  title: string;
  icon: LucideIcon;
  templateName: string;
  defaultParams?: Record<string, string>;
  defaultBody?: string;
}

export function DocumentList({
  category,
  basePath,
  title,
  icon: Icon,
  templateName,
  defaultParams = {},
  defaultBody = '',
}: DocumentListProps) {
  const { isSignedIn } = useAuth();
  const saveMutation = useSaveDocument();
  const { data: index, isLoading: loading } = useIndex(category);
  const items = index?.items ?? [];
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = useCallback(() => {
    setNewName('');
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    setDialogOpen(false);
    const doc = {
      version: 1,
      template: templateName,
      params: defaultParams,
      body: defaultBody,
    };
    try {
      const fileId = await saveMutation.mutateAsync({ category, name, data: doc });
      navigate(`${basePath}/${fileId}`);
    } finally {
      setCreating(false);
    }
  }, [newName, category, templateName, defaultParams, defaultBody, saveMutation, navigate, basePath]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-surface-container flex-shrink-0">
        <div className="flex items-center gap-3">
          <Icon size={20} className="text-on-surface-variant" aria-hidden="true" />
          <h1 className="text-lg font-headline font-semibold text-on-surface">
            {title}
          </h1>
        </div>
        {isSignedIn && (
          <button
            onClick={handleOpenDialog}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-primary/20 text-primary rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus size={18} aria-hidden="true" />
            {creating ? 'Creating...' : 'New'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 relative">
        {creating && <CreatingOverlay />}
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <CloudOff size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              Sign in with Google to save and manage documents.
            </p>
            <button
              onClick={() => navigate(`${basePath}/demo`)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
            >
              Try without saving
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-body text-on-surface-variant">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Icon size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              No documents yet. Click <strong>New</strong> to create one.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 max-w-2xl">
            {items.map((item) => (
              <button
                key={item.fileId}
                onClick={() => navigate(`${basePath}/${item.fileId}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-sm bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <FileText size={18} className="text-on-surface-variant" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-body font-semibold text-on-surface truncate">
                    {item.name}
                  </div>
                  {item.updatedAt && (
                    <div className="text-xs font-label text-on-surface-variant">
                      {new Date(item.updatedAt as string).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-on-surface-variant/50" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New document dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>
              Choose a name for your new document.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Document name"
              autoFocus
              className="w-full bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <DialogFooter className="mt-4">
              <DialogClose>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={!newName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
