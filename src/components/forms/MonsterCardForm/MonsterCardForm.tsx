import { memo, useMemo } from 'react';
import { ChevronRight, ChevronDown, InfoIcon } from 'lucide-react';
import { FormPanel } from '@/components/forms/common';
import { sortedMonsters } from '@/data/bestiary';
import type { IndexItem } from '@/data/documents/types';
import type { MonsterCardsDocument } from '@/data/documents/monster-cards';
import type { DocumentFormProps } from '@/data/documents/types';
import { monsterKey, monstersOf, useMonsterCardSelection } from './useMonsterCardSelection';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/shadcn/hover-card';

export function MonsterCardForm(props: DocumentFormProps<MonsterCardsDocument>) {
  const {
    groups,
    groupsLoading,
    selected,
    expanded,
    selectedCount,
    toggleMonster,
    toggleGroup,
    toggleExpanded,
  } = useMonsterCardSelection(props);

  const header = (<>
    <span className="text-sm font-semibold font-body text-on-surface">Monsters</span>
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            aria-label="About the monster cards template"
            className="ml-auto text-on-surface-variant hover:text-on-surface cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <InfoIcon size={16} aria-hidden="true" />
          </button>
        }
      />
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-72 text-xs"
      >
        This template is designed to be printed on Printable Index Card paper. I've used{' '}
        <a
          href="https://www.amazon.com/dp/B00006HPWA"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          this paper
        </a>{' '}
        in the past. You could also print on regular paper/card-stock and cut to size.
      </HoverCardContent>
    </HoverCard>
  </>);

  return (
    <FormPanel
      className="md:w-80"
      bodyClassName="space-y-4"
      header={header}
      footer={
        <span className="text-xs font-label text-on-surface-variant">
          {selectedCount} monster{selectedCount !== 1 ? 's' : ''} selected
        </span>
      }
    >
      {groups.map((group) => (
        <GroupPicker
          key={group.name}
          group={group}
          selected={selected}
          isCollapsed={!expanded.has(group.name)}
          onToggleCollapse={toggleExpanded}
          onToggleGroup={toggleGroup}
          onToggleMonster={toggleMonster}
        />
      ))}
      {groupsLoading && (
        <p className="text-xs font-label text-on-surface-variant text-center py-2">
          Loading custom groups...
        </p>
      )}
    </FormPanel>
  );
}

interface GroupPickerProps {
  group: IndexItem;
  selected: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: (groupName: string) => void;
  onToggleGroup: (groupName: string) => void;
  onToggleMonster: (groupName: string, name: string) => void;
}

// Re-render only when something that actually affects this group changes.
// `selected` is a single Set shared across all groups and gets a new
// identity on every toggle — the default shallow compare would rerender
// every GroupPicker on every click. Instead, compare selection membership
// for this group's monsters only.
function arePropsEqual(prev: GroupPickerProps, next: GroupPickerProps) {
  if (
    prev.group !== next.group ||
    prev.isCollapsed !== next.isCollapsed ||
    prev.onToggleCollapse !== next.onToggleCollapse ||
    prev.onToggleGroup !== next.onToggleGroup ||
    prev.onToggleMonster !== next.onToggleMonster
  ) {
    return false;
  }
  if (prev.selected === next.selected) return true;
  for (const m of monstersOf(prev.group)) {
    const key = monsterKey(prev.group.name, m.name);
    if (prev.selected.has(key) !== next.selected.has(key)) return false;
  }
  return true;
}

const GroupPicker = memo(function GroupPicker({
  group,
  selected,
  isCollapsed,
  onToggleCollapse,
  onToggleGroup,
  onToggleMonster,
}: GroupPickerProps) {
  const monsters = useMemo(() => sortedMonsters(monstersOf(group)), [group]);
  const allChecked = monsters.length > 0 && monsters.every((m) => selected.has(monsterKey(group.name, m.name)));
  const someChecked = monsters.some((m) => selected.has(monsterKey(group.name, m.name)));

  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <button
          onClick={() => onToggleCollapse(group.name)}
          className="flex items-center justify-center w-5 h-5 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
        >
          {isCollapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <label className="flex items-center gap-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked && !allChecked;
            }}
            onChange={() => onToggleGroup(group.name)}
            className="accent-primary -mt-px"
          />
          <span className="text-xs font-label font-bold tracking-wide uppercase text-on-surface-variant">
            {group.name}
          </span>
          {!!group.custom && (
            <span className="text-[9px] font-label text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-sm">
              Custom
            </span>
          )}
        </label>
      </div>

      {!isCollapsed && (
        <div className="space-y-0.5 ml-6">
          {monsters.map((monster) => (
            <label
              key={monster.name}
              className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded-sm hover:bg-surface-container-low transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(monsterKey(group.name, monster.name))}
                onChange={() => onToggleMonster(group.name, monster.name)}
                className="accent-primary mt-0.5"
              />
              <div className="min-w-0">
                <div className="text-sm font-body text-on-surface leading-tight">
                  {monster.name}
                </div>
                <div className="text-xs font-label text-on-surface-variant">
                  L{monster.level} {monster.roles.join(', ')} · EV {monster.ev ?? '-'}
                </div>
              </div>
            </label>
          ))}
          {monsters.length === 0 && (
            <p className="text-xs font-label text-on-surface-variant/50 px-2 py-1">
              No monsters in this group
            </p>
          )}
        </div>
      )}
    </div>
  );
}, arePropsEqual);
