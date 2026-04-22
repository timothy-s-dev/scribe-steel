import { getGroupSummaries, loadGroup } from '@/data/bestiary';
import { documentMetadataByCategory } from '@/documents';
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

// Virtual ids look like document ids to the rest of the app but have no
// backing Drive file. They flow through the normal cache + mutation paths;
// the query layer synthesizes an envelope on read, and the mutation layer
// no-ops the network save. Currently only 'demo' qualifies.
export function isVirtualId(id: string): boolean {
  return id === 'demo';
}

// Synthesizes a demo envelope from the category's createDefault so the
// editor can treat demo exactly like any other document — no isDemo branch
// in the UI. Returns null for non-virtual ids so the caller can fall
// through to static or Drive loading.
export function loadVirtualDocument(
  category: Category,
  id: string,
): Promise<{ data: unknown; version: number }> | null {
  if (!isVirtualId(id)) return null;
  const meta = documentMetadataByCategory[category];
  if (!meta) return null;
  return Promise.resolve({ data: meta.createDefault(''), version: 0 });
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
