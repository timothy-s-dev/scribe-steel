import type { Monster, MonsterGroup, MonsterSummary, GroupSummary } from './types';
import indexData from './index.json';

// Bestiary JSON fixtures don't carry ids; Feature/Monster require them.
// Hydrated groups are memoized by raw module identity so ids are stable
// across repeated loads (React keys would otherwise churn).
type RawFeature = Omit<Monster['features'][number], 'id'>;
type RawMonster = Omit<Monster, 'id' | 'features'> & { features: RawFeature[] };
type RawGroup = Omit<MonsterGroup, 'malice' | 'monsters'> & {
  malice: RawFeature[];
  monsters: RawMonster[];
};

const hydratedGroups = new WeakMap<RawGroup, MonsterGroup>();

function hydrateGroup(raw: RawGroup): MonsterGroup {
  const cached = hydratedGroups.get(raw);
  if (cached) return cached;
  const hydrated: MonsterGroup = {
    ...raw,
    malice: raw.malice.map((f) => ({ ...f, id: crypto.randomUUID() })),
    monsters: raw.monsters.map((m) => ({
      ...m,
      id: crypto.randomUUID(),
      features: m.features.map((f) => ({ ...f, id: crypto.randomUUID() })),
    })),
  };
  hydratedGroups.set(raw, hydrated);
  return hydrated;
}

// ── Lazy-load modules (returns promises, not eager imports) ─────────────────

const groupModules = import.meta.glob('./*.json') as Record<
  string,
  () => Promise<{ default: RawGroup }>
>;

// ── Summaries (sync, lightweight) ───────────────────────────────────────────

const summaries: GroupSummary[] = indexData as GroupSummary[];

export function getGroupSummaries(): GroupSummary[] {
  return summaries;
}

export function getAllMonsterSummaries(): MonsterSummary[] {
  return summaries.flatMap((g) => g.monsters);
}

// ── Full group loading (async) ───────────────────────────────────────────────

export async function loadGroup(groupName: string): Promise<MonsterGroup | null> {
  const entry = summaries.find((g) => g.name === groupName);
  if (!entry) return null;

  const loader = groupModules[`./${entry.file}`];
  if (!loader) return null;

  const mod = await loader();
  return hydrateGroup(mod.default);
}

export async function loadMonsterByName(monsterName: string): Promise<Monster | null> {
  const entry = summaries.find((g) => g.monsters.some((m) => m.name === monsterName));
  if (!entry) return null;

  const group = await loadGroup(entry.name);
  if (!group) return null;

  return group.monsters.find((m) => m.name === monsterName) ?? null;
}
