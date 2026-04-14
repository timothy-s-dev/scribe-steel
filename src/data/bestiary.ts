import type { MonsterGroup, Monster } from './types';

// Vite glob-imports all per-group JSON files eagerly.
// JSON modules come through as { default: T }.
const rawModules = import.meta.glob('./bestiary/*.json', { eager: true });

// Sort by the index order
import indexData from './bestiary/index.json';
const indexOrder = new Map(
  indexData.map((entry: { name: string; file: string }, i: number) => [entry.file, i]),
);

const groups: MonsterGroup[] = Object.entries(rawModules)
  .filter(([path]) => !path.endsWith('index.json'))
  .map(([path, mod]) => {
    const group = (mod as { default: MonsterGroup }).default;
    const file = path.split('/').pop()!;
    return { group, file };
  })
  .sort((a, b) => (indexOrder.get(a.file) ?? 999) - (indexOrder.get(b.file) ?? 999))
  .map(({ group }) => group);

export function getGroups(): MonsterGroup[] {
  return groups;
}

export function getAllMonsters(): Monster[] {
  return groups.flatMap((g) => g.monsters);
}

export function getMonsterByName(name: string): Monster | undefined {
  return getAllMonsters().find((m) => m.name === name);
}
