import { useCallback, useState, type ReactNode } from 'react';
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
import { PageHeader } from '@/components/PageHeader';

export interface CreateDocumentResult {
  data: unknown;
  extraIndexFields?: Record<string, unknown>;
}

export interface CreateDocumentDialogProps<Extras = void> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, extras: Extras) => void;
}

interface DocumentListProps<Extras = void> {
  category: Category;
  title: string;
  icon: LucideIcon;
  itemNoun: string;
  createDocument: (name: string, extras: Extras) => Promise<CreateDocumentResult> | CreateDocumentResult;
  demoEnabled?: boolean;
  renderCreateDocumentDialog?: (props: CreateDocumentDialogProps<Extras>) => ReactNode;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const pluralize = (s: string) => `${s}s`;

export function DocumentList<Extras = void>({
  category,
  title,
  icon: Icon,
  itemNoun,
  createDocument,
  demoEnabled = false,
  renderCreateDocumentDialog,
}: DocumentListProps<Extras>) {
  const { isSignedIn } = useAuth();
  const saveMutation = useSaveDocument();
  const { data: index, isLoading: loading } = useIndex(category);
  const items = (index?.items ?? []).filter((item) => item.custom !== false);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const nounTitle = titleCase(itemNoun);
  const nounPlural = pluralize(itemNoun);

  const handleCreate = useCallback(
    async (name: string, extras: Extras) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setCreating(true);
      setDialogOpen(false);

      try {
        const { data, extraIndexFields } = await createDocument(trimmed, extras);
        const result = await saveMutation.mutateAsync({
          category,
          name: trimmed,
          data,
          extraIndexFields,
        });
        navigate(result.fileId);
      } finally {
        setCreating(false);
      }
    },
    [category, createDocument, navigate, saveMutation],
  );

  const dialog = renderCreateDocumentDialog
    ? renderCreateDocumentDialog({
        open: dialogOpen,
        onOpenChange: setDialogOpen,
        onSubmit: handleCreate,
      })
    : (
      <DefaultCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nounTitle={nounTitle}
        itemNoun={itemNoun}
        onSubmit={(name) => handleCreate(name, undefined as Extras)}
      />
    );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={Icon}
        title={title}
        action={isSignedIn && (
          <button
            onClick={() => setDialogOpen(true)}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-primary/20 text-primary rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus size={18} aria-hidden="true" />
            {creating ? 'Creating...' : nounTitle}
          </button>
        )}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 relative">
        {creating && <CreatingOverlay />}
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <CloudOff size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              Sign in with Google to save and manage {nounPlural}.
            </p>
            {demoEnabled && (
              <button
                onClick={() => navigate('demo')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-surface-container-high text-on-surface-variant rounded-sm hover:bg-surface-container hover:text-primary transition-colors cursor-pointer"
              >
                Try without saving
              </button>
            )}
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-body text-on-surface-variant">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Icon size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              No {nounPlural} yet. Click <strong>+ {nounTitle}</strong> to create one.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 max-w-2xl">
            {items.map((item) => (
              <button
                key={item.fileId}
                onClick={() => navigate(item.fileId)}
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

      {dialog}
    </div>
  );
}

interface DefaultCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nounTitle: string;
  itemNoun: string;
  onSubmit: (name: string) => void;
}

function DefaultCreateDialog({ open, onOpenChange, nounTitle, itemNoun, onSubmit }: DefaultCreateDialogProps) {
  const [name, setName] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) setName('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {nounTitle}</DialogTitle>
          <DialogDescription>
            Choose a name for your new {itemNoun}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(name);
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${nounTitle} name`}
            autoFocus
            className="w-full bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <DialogFooter className="mt-4">
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
