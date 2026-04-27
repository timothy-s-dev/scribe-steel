import { Combobox } from '@base-ui/react/combobox';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputBaseClass } from '@/components/forms/common/formStyles';
import type { IndexItem } from '@/data/documents/types';

interface MonsterGroupSelectorProps {
  groups: IndexItem[];
  value: IndexItem | null;
  onValueChange: (group: IndexItem | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const inputClass = cn('w-full', inputBaseClass);

export function MonsterGroupSelector({
  groups,
  value,
  onValueChange,
  placeholder = 'Select group...',
  disabled,
  className,
}: MonsterGroupSelectorProps) {
  return (
    <Combobox.Root
      items={groups}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      itemToStringLabel={(g: IndexItem) => g.name}
      isItemEqualToValue={(a: IndexItem, b: IndexItem) => a.fileId === b.fileId}
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
          <Combobox.Popup className="bg-surface-container-high border border-outline-variant/30 rounded-sm shadow-lg max-h-72 overflow-y-auto custom-scrollbar min-w-[var(--anchor-width)]">
            <Combobox.Empty className="px-2 py-1.5 text-xs font-label text-on-surface-variant/60">
              No groups found
            </Combobox.Empty>
            <Combobox.List>
              {(group: IndexItem) => (
                <Combobox.Item
                  key={group.fileId}
                  value={group}
                  className="px-2 py-1.5 text-sm font-body text-on-surface cursor-pointer data-[highlighted]:bg-surface-container data-[selected]:font-semibold"
                >
                  {group.name}
                  {group.custom ? (
                    <span className="ml-1 text-xs font-label text-on-surface-variant/70">
                      (Custom)
                    </span>
                  ) : null}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
