import { getGroupSummaries, loadGroup } from '@/data/bestiary';
import type { Category, IndexItem } from '@/data/types';

interface StaticCategoryData {
  entries: () => IndexItem[];
  loadDocument: (id: string) => Promise<unknown>;
}

const registry = new Map<Category, StaticCategoryData>();

registry.set('monsters', {
  entries: () =>
    getGroupSummaries().map((g) => ({
      fileId: g.name,
      name: g.name,
      updatedAt: '',
      hasMalice: g.hasMalice,
      monsters: g.monsters,
      custom: false,
    })),
  loadDocument: (id) => loadGroup(id),
});

export function getStaticEntries(category: Category): IndexItem[] {
  return registry.get(category)?.entries() ?? [];
}

// Static documents are immutable and have no real version. The editor never
// saves them, so the version is only here to keep the cache shape uniform
// with Drive-loaded documents.
export function loadStaticDocument(
  category: Category,
  id: string,
): Promise<{ data: unknown; version: number }> | null {
  const data = registry.get(category);
  if (!data) return null;
  const isStatic = data.entries().some((e) => e.fileId === id);
  if (!isStatic) return null;
  return data.loadDocument(id).then((d) => ({ data: d, version: 0 }));
}
