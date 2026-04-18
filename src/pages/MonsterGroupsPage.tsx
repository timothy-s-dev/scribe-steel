import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Users } from 'lucide-react';
import { useFetchDocument } from '@/hooks/queries/useDocument';
import { useIndex } from '@/hooks/queries/useIndex';
import { DocumentList, type CreateDocumentDialogProps } from '@/components/DocumentList';
import type { IndexItem, MonsterGroup, SavedMonsterGroup } from '@/data/types';
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

interface Extras {
  copyFrom: string;
}

export function MonsterGroupsPage() {
  usePageTitle('Monster Groups');
  const fetchDocument = useFetchDocument();
  const { data: monsterIndex } = useIndex('monsters');
  const maliceSources = (monsterIndex?.items ?? []).filter((g) => g.hasMalice);

  return (
    <DocumentList<Extras>
      category="monsters"
      title="Monster Groups"
      icon={Users}
      itemNoun="monster group"
      createDocument={async (name, { copyFrom }) => {
        const source = copyFrom ? await fetchDocument<MonsterGroup>('monsters', copyFrom) : null;
        const data: SavedMonsterGroup = {
          version: 2,
          name,
          malice: source ? structuredClone(source.malice) : [],
          monsters: [],
        };
        return {
          data,
          extraIndexFields: {
            hasMalice: data.malice.length > 0,
            monsters: [],
          },
        };
      }}
      renderCreateDocumentDialog={(props) => (
        <NewMonsterGroupDialog {...props} maliceSources={maliceSources} />
      )}
    />
  );
}

interface NewMonsterGroupDialogProps extends CreateDocumentDialogProps<Extras> {
  maliceSources: IndexItem[];
}

function NewMonsterGroupDialog({ open, onOpenChange, onSubmit, maliceSources }: NewMonsterGroupDialogProps) {
  const [name, setName] = useState('');
  const [copyFrom, setCopyFrom] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setCopyFrom('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            onSubmit(name, { copyFrom });
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-label text-on-surface-variant block mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                {maliceSources.map((g) => (
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
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
