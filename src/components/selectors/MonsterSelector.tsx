import { Combobox } from '@base-ui/react/combobox';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sortedMonsters } from '@/data/bestiary';
import type { IndexItem } from '@/data/types';
import type { MonsterSummary } from '@/data/bestiary';

interface MonsterSelectorProps {
  groups: IndexItem[];
  value: MonsterSummary | null;
  onValueChange: (monster: MonsterSummary | null, group: IndexItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface Entry {
  monster: MonsterSummary;
  group: IndexItem;
}

interface Group {
  value: string;
  items: Entry[];
}

const inputClass =
  'w-full bg-surface-container-high text-on-surface text-sm font-body px-2 py-1.5 rounded-sm border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary';

function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

export function MonsterSelector({
  groups,
  value,
  onValueChange,
  placeholder = 'Select monster...',
  disabled,
  className,
}: MonsterSelectorProps) {
  const items: Group[] = groups
    .map((g) => ({
      value: g.name,
      items: sortedMonsters(monstersOf(g)).map((m) => ({ monster: m, group: g })),
    }))
    .filter((g) => g.items.length > 0);

  let selected: Entry | null = null;
  if (value) {
    for (const g of groups) {
      const m = monstersOf(g).find((x) => x.name === value.name);
      if (m) {
        selected = { monster: m, group: g };
        break;
      }
    }
  }

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(next: Entry | null) => onValueChange(next?.monster ?? null, next?.group ?? null)}
      disabled={disabled}
      itemToStringLabel={(e: Entry) => e.monster.name}
      isItemEqualToValue={(a: Entry, b: Entry) =>
        a.group.fileId === b.group.fileId && a.monster.name === b.monster.name
      }
      filter={(entry: Entry, query: string) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          entry.monster.name.toLowerCase().includes(q) ||
          entry.group.name.toLowerCase().includes(q)
        );
      }}
    >
      <Combobox.InputGroup className={cn('relative', className)}>
        <Combobox.Input placeholder={placeholder} className={cn(inputClass, 'pr-7')} />
        <Combobox.Trigger
          aria-label="Open"
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-on-surface-variant/70 hover:text-on-surface-variant cursor-pointer"
        >
          <ChevronDown size={14} aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-50">
          <Combobox.Popup className="bg-surface-container-high border border-outline-variant/30 rounded-sm shadow-lg max-h-80 overflow-y-auto custom-scrollbar min-w-[var(--anchor-width)]">
            <Combobox.Empty className="px-2 py-1.5 text-xs font-label text-on-surface-variant/60">
              No monsters found
            </Combobox.Empty>
            <Combobox.List>
              {(group: Group) => (
                <Combobox.Group key={group.value} items={group.items}>
                  <Combobox.GroupLabel className="px-2 pt-2 pb-1 text-[10px] font-label font-bold uppercase tracking-wide text-on-surface-variant/70">
                    {group.value}
                  </Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(entry: Entry) => (
                      <Combobox.Item
                        key={`${entry.group.fileId}:${entry.monster.name}`}
                        value={entry}
                        className="pl-5 pr-2 py-1.5 text-sm font-body text-on-surface cursor-pointer data-[highlighted]:bg-surface-container data-[selected]:font-semibold"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="truncate">{entry.monster.name}</span>
                          <span className="text-xs font-label text-on-surface-variant/70 flex-shrink-0">
                            L{entry.monster.level} {entry.monster.roles.join(', ')} · EV {entry.monster.ev ?? '-'}
                          </span>
                        </div>
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
