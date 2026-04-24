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
// editor can treat demo exactly like any other document. The `source`
// tag lets downstream code (mutation hook, editor UI) recognize this as
// non-persistent without reparsing the fileId. Returns null for
// non-virtual ids so the caller can fall through to static or Drive
// loading.
export function loadVirtualDocument(
  category: Category,
  id: string,
): Promise<{ data: unknown; md5: string; source: 'virtual' }> | null {
  if (!isVirtualId(id)) return null;
  const meta = documentMetadataByCategory[category];
  if (!meta) return null;
  return Promise.resolve({ data: meta.createDefault(''), md5: '', source: 'virtual' });
}

// Static documents are immutable and have no real content hash. The
// editor never saves them — `source: 'static'` flags them so the
// mutation hook short-circuits the save path. The md5 is only here to
// keep the envelope shape uniform with Drive-loaded documents.
export function loadStaticDocument(
  category: Category,
  id: string,
): Promise<{ data: unknown; md5: string; source: 'static' }> | null {
  const data = registry.get(category);
  if (!data) return null;
  const isStatic = data.entries().some((e) => e.fileId === id);
  if (!isStatic) return null;
  return data.loadDocument(id).then((d) => ({ data: d, md5: '', source: 'static' }));
}
