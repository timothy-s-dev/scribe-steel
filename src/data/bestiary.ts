import type { Bestiary, Faction, Monster } from './types';
import data from './bestiary.json';

const bestiary = data as Bestiary;

export function getBestiary(): Bestiary {
  return bestiary;
}

export function getFactions(): Faction[] {
  return bestiary.factions;
}

export function getAllMonsters(): Monster[] {
  return bestiary.factions.flatMap((f) => f.monsters);
}

export function getMonsterByName(name: string): Monster | undefined {
  return getAllMonsters().find((m) => m.name === name);
}
