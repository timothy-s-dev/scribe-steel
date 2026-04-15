import { useState, useEffect } from 'react';
import { getGroups } from '@/data/bestiary';
import { useAuth } from '@/contexts/AuthContext';
import { useStorage } from '@/contexts/StorageContext';
import { migrateMonsterGroup } from '@/data/migrate';
import type { MonsterGroup, SavedMonsterGroup } from '@/data/types';

export interface TaggedGroup extends MonsterGroup {
  custom?: boolean;
}

/**
 * Returns all monster groups: preset groups from the bundled bestiary,
 * plus any custom groups saved to Google Drive.
 */
export function useAllGroups(): { groups: TaggedGroup[]; loading: boolean } {
  const { isSignedIn } = useAuth();
  const { fetchIndex, load } = useStorage();
  const [customGroups, setCustomGroups] = useState<TaggedGroup[]>([]);
  const [loading, setLoading] = useState(isSignedIn);

  useEffect(() => {
    if (!isSignedIn) {
      setCustomGroups([]);
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

      const loaded: TaggedGroup[] = [];
      for (const item of index.items) {
        const raw = await load<SavedMonsterGroup>(item.fileId);
        if (raw) {
          const doc = migrateMonsterGroup(raw);
          loaded.push({
            name: doc.name,
            malice: doc.malice,
            monsters: doc.monsters,
            custom: true,
          });
        }
      }
      setCustomGroups(loaded);
      setLoading(false);
    })();
  }, [isSignedIn, fetchIndex, load]);

  const preset: TaggedGroup[] = getGroups().map((g) => ({ ...g, custom: false }));
  return { groups: [...preset, ...customGroups], loading };
}
