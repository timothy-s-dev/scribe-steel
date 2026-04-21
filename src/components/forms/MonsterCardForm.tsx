import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useIndex } from '@/hooks/queries/useIndex';
import { useDocuments } from '@/hooks/queries/useDocument';
import type { IndexItem, MonsterGroup, Monster } from '@/data/types';
import type { MonsterSummary } from '@/data/bestiary';
import type { MonsterCardsDocument } from '@/documents/monster-cards';

interface MonsterCardFormProps {
  initialSaved: MonsterCardsDocument;
  onChange: (saved: MonsterCardsDocument) => void;
}

function monsterKey(groupName: string, monsterName: string) {
  return `${groupName}\0${monsterName}`;
}

function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

function roleRank(monster: MonsterSummary): number {
  const roles = monster.roles.map((r) => r.toLowerCase());
  if (roles.some((r) => r.startsWith('minion'))) return 0;
  if (roles.includes('leader')) return 2;
  return 1;
}

function sortedMonsters(monsters: MonsterSummary[]): MonsterSummary[] {
  return [...monsters].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const ar = roleRank(a);
    const br = roleRank(b);
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
}

export function MonsterCardForm({ initialSaved, onChange }: MonsterCardFormProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const { data: index, isLoading: groupsLoading } = useIndex('monsters');
  const groups = index?.items ?? [];

  const toggleMonster = useCallback((groupName: string, name: string) => {
    const key = monsterKey(groupName, name);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleGroup = useCallback(
    (groupName: string) => {
      const group = groups.find((g) => g.name === groupName);
      if (!group) return;
      setSelected((prev) => {
        const next = new Set(prev);
        const allSelected = monstersOf(group).every((m) => prev.has(monsterKey(groupName, m.name)));
        for (const m of monstersOf(group)) {
          const key = monsterKey(groupName, m.name);
          if (allSelected) next.delete(key);
          else next.add(key);
        }
        return next;
      });
    },
    [groups],
  );

  const toggleExpanded = useCallback((groupName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  const selectedByGroup = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of selected) {
      const [groupName, monsterName] = key.split('\0');
      if (!map.has(groupName)) map.set(groupName, []);
      map.get(groupName)!.push(monsterName);
    }
    return map;
  }, [selected]);

  const selectedGroupIds = useMemo(() => {
    const ids: string[] = [];
    for (const groupName of selectedByGroup.keys()) {
      const entry = groups.find((g) => g.name === groupName);
      if (entry) ids.push(entry.fileId);
    }
    return ids;
  }, [selectedByGroup, groups]);

  const groupQueries = useDocuments<MonsterGroup>('monsters', selectedGroupIds);

  const loadedMonsters = useMemo(() => {
    const monsters: Monster[] = [];
    const groupMap = new Map(
      selectedGroupIds.map((id, i) => [id, groupQueries[i]?.data]),
    );
    for (const [groupName, monsterNames] of selectedByGroup) {
      const entry = groups.find((g) => g.name === groupName);
      const group = entry ? groupMap.get(entry.fileId) : null;
      if (group) {
        for (const name of monsterNames) {
          const m = group.monsters.find((mon) => mon.name === name);
          if (m) monsters.push(m);
        }
      }
    }
    return monsters;
  }, [selectedByGroup, groups, selectedGroupIds, groupQueries]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialSavedRef = useRef(initialSaved);
  const lastEmittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = JSON.stringify(loadedMonsters);
    if (key === lastEmittedKeyRef.current) return;
    lastEmittedKeyRef.current = key;
    onChangeRef.current({ ...initialSavedRef.current, monsters: loadedMonsters });
  }, [loadedMonsters]);

  return (
    <div className="flex-1 min-w-0 md:w-80 md:flex-none flex flex-col overflow-hidden md:border-r border-outline-variant/20">
      <div className="hidden md:flex items-center h-11 px-4 py-2 bg-surface-container flex-shrink-0">
        <span className="text-sm font-semibold font-body text-on-surface">Monsters</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-4">
        {groups.map((group) => (
          <GroupPicker
            key={group.name}
            group={group}
            selected={selected}
            isCollapsed={!expanded.has(group.name)}
            onToggleCollapse={() => toggleExpanded(group.name)}
            onToggleGroup={() => toggleGroup(group.name)}
            onToggleMonster={toggleMonster}
          />
        ))}
        {groupsLoading && (
          <p className="text-xs font-label text-on-surface-variant text-center py-2">
            Loading custom groups...
          </p>
        )}
      </div>

      <div className="px-4 py-3 bg-surface-container flex-shrink-0">
        <div className="text-xs font-label text-on-surface-variant">
          {selected.size} monster{selected.size !== 1 ? 's' : ''} selected
        </div>
      </div>
    </div>
  );
}

function GroupPicker({
  group,
  selected,
  isCollapsed,
  onToggleCollapse,
  onToggleGroup,
  onToggleMonster,
}: {
  group: IndexItem;
  selected: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleGroup: () => void;
  onToggleMonster: (groupName: string, name: string) => void;
}) {
  const monsters = useMemo(() => sortedMonsters(monstersOf(group)), [group]);
  const allChecked = monsters.every((m) => selected.has(monsterKey(group.name, m.name)));
  const someChecked = monsters.some((m) => selected.has(monsterKey(group.name, m.name)));

  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <button
          onClick={onToggleCollapse}
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
            onChange={onToggleGroup}
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
}
