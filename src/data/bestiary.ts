import type { Bestiary, MonsterGroup, Monster } from './types';
import data from './bestiary.json';

const bestiary = data as Bestiary;

export function getBestiary(): Bestiary {
  return bestiary;
}

export function getGroups(): MonsterGroup[] {
  return bestiary.groups;
}

export function getAllMonsters(): Monster[] {
  return bestiary.groups.flatMap((g) => g.monsters);
}

export function getMonsterByName(name: string): Monster | undefined {
  return getAllMonsters().find((m) => m.name === name);
}
