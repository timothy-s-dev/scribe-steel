import type { Monster, MonsterGroup, MonsterSummary, GroupSummary } from './bestiary.types';
import indexData from './bestiary/index.json';

// ── Lazy-load modules (returns promises, not eager imports) ─────────────────

const groupModules = import.meta.glob('./bestiary/*.json') as Record<
  string,
  () => Promise<{ default: MonsterGroup }>
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

  const loader = groupModules[`./bestiary/${entry.file}`];
  if (!loader) return null;

  const mod = await loader();
  return mod.default;
}

export async function loadMonsterByName(monsterName: string): Promise<Monster | null> {
  const entry = summaries.find((g) => g.monsters.some((m) => m.name === monsterName));
  if (!entry) return null;

  const group = await loadGroup(entry.name);
  if (!group) return null;

  return group.monsters.find((m) => m.name === monsterName) ?? null;
}
