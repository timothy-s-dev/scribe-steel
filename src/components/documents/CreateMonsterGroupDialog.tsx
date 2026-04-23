import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { MonsterGroupSelector } from '@/components/selectors/MonsterGroupSelector';
import { useIndex } from '@/hooks/queries/useIndex';
import { useFetchDocument } from '@/hooks/queries/useDocument';
import { monsterGroupsMetadata, type MonsterGroupDocument } from '@/documents/monster-groups';
import { cloneFeature, type MonsterGroup } from '@/data/bestiary';
import type { IndexItem } from '@/data/types';
import type { CreateDialogProps } from './NameOnlyCreateDialog';

export function CreateMonsterGroupDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateDialogProps<MonsterGroupDocument>) {
  const [name, setName] = useState('');
  const [copyFrom, setCopyFrom] = useState<IndexItem | null>(null);
  const { data: index } = useIndex('monsters');
  const fetchDocument = useFetchDocument();
  const maliceSources = (index?.items ?? []).filter((g) => g.hasMalice);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName('');
      setCopyFrom(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const data = monsterGroupsMetadata.createDefault(trimmed);
    if (copyFrom) {
      const source = await fetchDocument<MonsterGroup>('monsters', copyFrom.fileId);
      data.malice = source.malice.map(cloneFeature);
    }
    onSubmit(trimmed, data);
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
        <form onSubmit={handleSubmit}>
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
              <MonsterGroupSelector
                groups={maliceSources}
                value={copyFrom}
                onValueChange={setCopyFrom}
                placeholder="Start empty"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
