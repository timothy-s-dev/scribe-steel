import { useState, useEffect } from 'react';
import { getGroups } from '@/data/bestiary';
import { useAuth } from '@/contexts/AuthContext';
import { useStorage } from '@/contexts/StorageContext';
import type { MonsterGroup, SavedMonsterGroup } from '@/data/types';

export interface TaggedGroup extends MonsterGroup {
  custom?: boolean;
}

/**
 * Returns all monster groups: preset groups from the bundled bestiary,
 * plus any custom groups saved to Google Drive.
 */
export function useAllGroups(): TaggedGroup[] {
  const { isSignedIn } = useAuth();
  const { fetchIndex, load } = useStorage();
  const [customGroups, setCustomGroups] = useState<TaggedGroup[]>([]);

  useEffect(() => {
    if (!isSignedIn) {
      setCustomGroups([]);
      return;
    }

    (async () => {
      const index = await fetchIndex('monsters');
      if (!index || index.items.length === 0) return;

      const loaded: TaggedGroup[] = [];
      for (const item of index.items) {
        const doc = await load<SavedMonsterGroup>(item.fileId);
        if (doc) {
          loaded.push({
            name: doc.name,
            malice: doc.malice,
            monsters: doc.monsters,
            custom: true,
          });
        }
      }
      setCustomGroups(loaded);
    })();
  }, [isSignedIn, fetchIndex, load]);

  const preset: TaggedGroup[] = getGroups().map((g) => ({ ...g, custom: false }));
  return [...preset, ...customGroups];
}
