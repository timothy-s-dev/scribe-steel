import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIndex } from '@/hooks/queries/useIndex';
import { useSaveDocument } from '@/hooks/queries/useDocument';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Plus, CloudOff, FileText, ChevronRight } from 'lucide-react';
import { CreatingOverlay } from '@/components/CreatingOverlay';
import { PageHeader } from '@/components/PageHeader';
import { SignInButton } from '@/components/auth/SignInButton';
import { getCreateDialog } from '@/components/createDialogs/registry';
import type { DocumentMetadata } from '@/data/documents';
import { listTitle, pluralize, titleCase } from '@/data/documents/titles';

interface DocumentListProps<Data> {
  type: DocumentMetadata<Data>;
}

export function DocumentList<Data>({ type }: DocumentListProps<Data>) {
  usePageTitle(listTitle(type));
  const { isSignedIn } = useAuth();
  const saveMutation = useSaveDocument();
  const { data: index, isLoading: loading } = useIndex(type.category);
  const items = (index?.items ?? []).filter((item) => item.custom !== false);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const Icon = type.icon;
  const nounTitle = titleCase(type.noun);
  const nounPlural = pluralize(type.noun);
  const CreateDialog = getCreateDialog<Data>(type.category);

  const handleCreate = useCallback(
    async (name: string, data: Data) => {
      setCreating(true);
      setDialogOpen(false);
      try {
        const extraIndexFields = type.indexFields?.(data);
        const result = await saveMutation.mutateAsync({
          mode: 'create',
          category: type.category,
          name,
          data,
          extraIndexFields,
        });
        navigate(result.fileId);
      } finally {
        setCreating(false);
      }
    },
    [type, navigate, saveMutation],
  );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={Icon}
        title={listTitle(type)}
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
            <SignInButton />
            {type.demoEnabled && (
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

      <CreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
