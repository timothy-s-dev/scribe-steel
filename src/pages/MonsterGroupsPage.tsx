import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Users, Plus, CloudOff, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSaveDocument, useFetchDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import type { MonsterGroup, SavedMonsterGroup } from '@/data/types';
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

export function MonsterGroupsPage() {
  usePageTitle('Monster Groups');
  const { isSignedIn } = useAuth();
  const saveMutation = useSaveDocument();
  const { data: monsterIndex, isLoading: loading } = useIndex('monsters');
  const allGroups = monsterIndex?.items ?? [];
  const customItems = allGroups.filter((g) => !!g.custom);
  const fetchDocument = useFetchDocument();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copyFrom, setCopyFrom] = useState('');

  const handleOpenDialog = useCallback(() => {
    setNewName('');
    setCopyFrom('');
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    setDialogOpen(false);

    const source = copyFrom ? await fetchDocument<MonsterGroup>('monsters', copyFrom) : null;
    const doc: SavedMonsterGroup = {
      version: 2,
      name,
      malice: source ? structuredClone(source.malice) : [],
      monsters: [],
    };

    try {
      const result = await saveMutation.mutateAsync({
        category: 'monsters',
        name,
        data: doc,
        extraIndexFields: {
          hasMalice: doc.malice.length > 0,
          monsters: doc.monsters.map((m) => ({
            name: m.name,
            level: m.level,
            roles: m.roles,
            ev: m.ev,
          })),
        },
      });
      navigate(`/monster-groups/${result.fileId}`);
    } finally {
      setCreating(false);
    }
  }, [newName, copyFrom, fetchDocument, saveMutation, navigate]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={Users}
        title="Monster Groups"
        action={isSignedIn && (
          <button
            onClick={handleOpenDialog}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold tracking-wide bg-primary/20 text-primary rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus size={18} aria-hidden="true" />
            {creating ? 'Creating...' : 'New Group'}
          </button>
        )}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 relative">
        {creating && <CreatingOverlay />}
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <CloudOff size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              Sign in with Google to create and manage monster groups.
            </p>
          </div>
        ) : loading && customItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-body text-on-surface-variant">Loading...</p>
          </div>
        ) : customItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Users size={48} className="text-on-surface-variant/30" aria-hidden="true" />
            <p className="text-sm font-body text-on-surface-variant">
              No monster groups yet. Click <strong>New Group</strong> to create one.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 max-w-2xl">
            {customItems.map((item) => (
              <button
                key={item.fileId}
                onClick={() => navigate(`/monster-groups/${item.fileId}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-sm bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <Users size={18} className="text-on-surface-variant" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-body font-semibold text-on-surface truncate">
                    {item.name}
                  </div>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant/50" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Monster Group</DialogTitle>
            <DialogDescription>
              Create a new group of monsters with shared malice abilities.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs font-label text-on-surface-variant block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Undead Horde"
                  autoFocus
                  className="w-full bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-label text-on-surface-variant block mb-1">
                  Copy malice from (optional)
                </label>
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  className="w-full bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Start empty</option>
                  {allGroups.filter((g) => g.hasMalice).map((g) => (
                    <option key={g.fileId} value={g.fileId}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
