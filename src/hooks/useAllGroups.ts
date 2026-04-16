import { useState, useEffect, useCallback } from 'react';
import { getGroupSummaries, loadGroup, type GroupSummary, type MonsterSummary } from '@/data/bestiary';
import { useAuth } from '@/contexts/AuthContext';
import { useStorage } from '@/contexts/StorageContext';
import { migrateMonsterGroup } from '@/data/migrate';
import type { MonsterGroup, SavedMonsterGroup } from '@/data/types';

export interface TaggedGroupSummary extends GroupSummary {
  custom?: boolean;
}

export type { MonsterSummary };

/**
 * Returns group summaries (lightweight) for all monster groups:
 * preset groups from the bundled bestiary, plus custom groups from Google Drive.
 *
 * Use `loadGroup` to fetch full monster data on demand.
 */
export function useAllGroups(): {
  groups: TaggedGroupSummary[];
  loading: boolean;
  loadGroup: (groupName: string) => Promise<MonsterGroup | null>;
} {
  const { isSignedIn } = useAuth();
  const { fetchIndex, load } = useStorage();
  const [customGroups, setCustomGroups] = useState<TaggedGroupSummary[]>([]);
  const [customGroupCache, setCustomGroupCache] = useState<Map<string, MonsterGroup>>(new Map());
  const [loading, setLoading] = useState(isSignedIn);

  useEffect(() => {
    if (!isSignedIn) {
      setCustomGroups([]);
      setCustomGroupCache(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const index = await fetchIndex('monsters');
      if (!index || index.items.length === 0) {
        setLoading(false);
        return;
      }

      const loaded: TaggedGroupSummary[] = [];
      const cache = new Map<string, MonsterGroup>();
      for (const item of index.items) {
        const raw = await load<SavedMonsterGroup>(item.fileId);
        if (raw) {
          const doc = migrateMonsterGroup(raw);
          cache.set(doc.name, doc);
          loaded.push({
            name: doc.name,
            file: item.fileId,
            hasMalice: doc.malice.length > 0,
            monsters: doc.monsters.map((m) => ({
              name: m.name,
              level: m.level,
              roles: m.roles,
              ev: m.ev,
            })),
            custom: true,
          });
        }
      }
      setCustomGroups(loaded);
      setCustomGroupCache(cache);
      setLoading(false);
    })();
  }, [isSignedIn, fetchIndex, load]);

  const loadGroupByName = useCallback(
    async (groupName: string): Promise<MonsterGroup | null> => {
      // Check custom group cache first
      const customCached = customGroupCache.get(groupName);
      if (customCached) return customCached;

      // Fall back to built-in bestiary loader (has its own cache)
      return loadGroup(groupName);
    },
    [customGroupCache],
  );

  const preset: TaggedGroupSummary[] = getGroupSummaries().map((g) => ({ ...g, custom: false }));
  return { groups: [...preset, ...customGroups], loading, loadGroup: loadGroupByName };
}
