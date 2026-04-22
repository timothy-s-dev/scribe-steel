import type { Monster } from './bestiary.types';

export function emptyMonster(): Monster {
  return {
    name: '',
    level: 1,
    roles: [],
    ancestry: [],
    ev: 1,
    size: '1M',
    speed: 5,
    stamina: 10,
    stability: 0,
    free_strike: 1,
    might: 0,
    agility: 0,
    reason: 0,
    intuition: 0,
    presence: 0,
    features: [],
  };
}
