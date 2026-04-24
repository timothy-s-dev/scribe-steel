import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useIndex } from '@/hooks/queries/useIndex';
import { useDocuments } from '@/hooks/queries/useDocument';
import { sortedMonsters } from '@/data/bestiary';
import type { IndexItem } from '@/data/types';
import type { Monster, MonsterGroup, MonsterSummary } from '@/data/bestiary';
import type { MonsterCardsDocument } from '@/documents/monster-cards';
import type { DocumentFormProps } from '@/documents/types';

// Picker state is purely transient — nothing derives from `value.monsters`,
// the hook only *writes* to it via onChange. The monster-cards form is always
// mounted with forceDemo, so there's no saved state to hydrate checkboxes
// from. If that ever changes, this hook is the place to wire it up.
export function monsterKey(groupName: string, monsterName: string) {
  return `${groupName}\0${monsterName}`;
}

export function monstersOf(item: IndexItem): MonsterSummary[] {
  return (item.monsters as MonsterSummary[] | undefined) ?? [];
}

export interface MonsterCardSelection {
  groups: IndexItem[];
  groupsLoading: boolean;
  selected: Set<string>;
  expanded: Set<string>;
  selectedCount: number;
  toggleMonster: (groupName: string, name: string) => void;
  toggleGroup: (groupName: string) => void;
  toggleExpanded: (groupName: string) => void;
}

export function useMonsterCardSelection({
  value,
  onChange,
}: DocumentFormProps<MonsterCardsDocument>): MonsterCardSelection {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const { data: index, isLoading: groupsLoading } = useIndex('monsters');
  const groups = useMemo(() => index?.items ?? [], [index?.items]);

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

  const { data: groupData, isLoading: groupDataLoading } =
    useDocuments<MonsterGroup>('monsters', selectedGroupIds);

  const loadedMonsters = useMemo(() => {
    const monsters: Monster[] = [];
    const groupMap = new Map(
      selectedGroupIds.map((id, i) => [id, groupData[i]]),
    );
    // Emit monsters in a stable, meaningful order: group name ascending,
    // then (within a group) level → role → name via sortedMonsters.
    // Matches the ordering used in the picker and MonsterSelector.
    const orderedGroupNames = Array.from(selectedByGroup.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    for (const groupName of orderedGroupNames) {
      const entry = groups.find((g) => g.name === groupName);
      const group = entry ? groupMap.get(entry.fileId) : null;
      if (!group) continue;
      const selectedNames = new Set(selectedByGroup.get(groupName));
      const picked = group.monsters.filter((m) => selectedNames.has(m.name));
      for (const m of sortedMonsters(picked)) monsters.push(m);
    }
    return monsters;
  }, [selectedByGroup, groups, selectedGroupIds, groupData]);

  // Emit when the resolved monster set changes — whether from a user
  // toggle (selection change) or from an async group-document fetch
  // completing (groupData change). `value` is read via useEffectEvent so
  // cache-roundtrips that bump `value`'s identity but leave loadedMonsters
  // alone don't re-fire this effect. Without that guard, every save
  // success would re-emit and loop.
  //
  // Rapid selection changes (e.g., clicking groups in quick succession)
  // fire off N overlapping group-document fetches that resolve at
  // slightly staggered times. Emitting on each partial resolution
  // cascades N onChange→buildSource→compile cycles with increasingly
  // large payloads, which can starve the renderer. We hold the emit
  // until the set has fully settled — no in-flight fetches — so the
  // pipeline downstream sees one change instead of a staircase.
  const emit = useEffectEvent((monsters: Monster[]) => {
    onChange({ ...value, monsters });
  });
  useEffect(() => {
    if (groupDataLoading) return;
    emit(loadedMonsters);
  }, [loadedMonsters, groupDataLoading]);

  return {
    groups,
    groupsLoading,
    selected,
    expanded,
    selectedCount: selected.size,
    toggleMonster,
    toggleGroup,
    toggleExpanded,
  };
}
