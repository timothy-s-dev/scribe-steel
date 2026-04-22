import type { Monster, Feature } from './bestiary.types';

export function emptyMonster(): Monster {
  return {
    id: crypto.randomUUID(),
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

// Clone a feature with a fresh id. Use whenever a feature is duplicated into
// a user document — without re-id, React keys collide when the same bestiary
// source is copied more than once.
export function cloneFeature(f: Feature): Feature {
  return { ...structuredClone(f), id: crypto.randomUUID() };
}

// Clone a monster with a fresh id, re-iding its nested features too.
export function cloneMonster(m: Monster): Monster {
  const cloned = structuredClone(m);
  cloned.id = crypto.randomUUID();
  cloned.features = cloned.features.map((f) => ({ ...f, id: crypto.randomUUID() }));
  return cloned;
}
