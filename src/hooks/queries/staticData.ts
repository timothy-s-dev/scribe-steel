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

export function loadStaticDocument(category: Category, id: string): Promise<unknown> | null {
  const data = registry.get(category);
  if (!data) return null;
  const isStatic = data.entries().some((e) => e.fileId === id);
  if (!isStatic) return null;
  return data.loadDocument(id);
}
