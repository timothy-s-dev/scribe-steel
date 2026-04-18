import { useState } from 'react';
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

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export interface CreateDialogProps<Data> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, data: Data) => void;
}

interface NameOnlyCreateDialogProps<Data> extends CreateDialogProps<Data> {
  noun: string;
  createDefault: (name: string) => Data;
}

export function NameOnlyCreateDialog<Data>({
  open,
  onOpenChange,
  onSubmit,
  noun,
  createDefault,
}: NameOnlyCreateDialogProps<Data>) {
  const [name, setName] = useState('');
  const nounTitle = titleCase(noun);

  const handleOpenChange = (next: boolean) => {
    if (!next) setName('');
    onOpenChange(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, createDefault(trimmed));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {nounTitle}</DialogTitle>
          <DialogDescription>
            Choose a name for your new {noun}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${nounTitle} name`}
            autoFocus
            className="w-full bg-surface-container-high text-on-surface text-sm font-body px-3 py-2 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
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
