import type { SavedMonsterGroup, Monster, Feature, Effect } from './types';

/**
 * Migrate a SavedMonsterGroup from v1 (old format) to v2 (SC format).
 * Returns the document unchanged if already v2+.
 */
export function migrateMonsterGroup(doc: SavedMonsterGroup): SavedMonsterGroup {
  if (doc.version >= 2) return doc;

  const old = doc as unknown as V1SavedMonsterGroup;
  return {
    version: 2,
    name: old.name,
    malice: (old.malice ?? []).map(migrateOldMalice),
    monsters: (old.monsters ?? []).map(migrateOldMonster),
  };
}

// ── V1 types (old format) ──────────────────────────────────────────────────

interface V1MaliceFeature {
  cost: number;
  name: string;
  description: string;
}

interface V1PowerRollTier {
  tier: string;
  result: string;
}

interface V1Ability {
  name: string;
  type?: string;
  action?: string;
  keywords?: string[];
  distance?: string;
  target?: string;
  damage?: string;
  powerRoll?: V1PowerRollTier[];
  effect?: string;
}

interface V1Trait {
  name: string;
  description: string;
}

interface V1Monster {
  name: string;
  level: number;
  role: string;
  keywords: string[];
  ev: number;
  size: string;
  speed: number;
  stamina: number;
  stability: number;
  freeStrike: number;
  immunity: string | null;
  weakness: string | null;
  movement: string | null;
  characteristics: {
    might: number;
    agility: number;
    reason: number;
    intuition: number;
    presence: number;
  };
  abilities: V1Ability[];
  traits: V1Trait[];
}

interface V1SavedMonsterGroup {
  version: number;
  name: string;
  malice: V1MaliceFeature[];
  monsters: V1Monster[];
}

// ── Migration helpers ──────────────────────────────────────────────────────

function migrateOldMalice(m: V1MaliceFeature): Feature {
  return {
    type: 'feature',
    feature_type: 'trait',
    name: m.name,
    cost: String(m.cost),
    effects: [{ effect: m.description }],
  };
}

function migrateOldMonster(m: V1Monster): Monster {
  const features: Feature[] = [];

  for (const ab of m.abilities ?? []) {
    const effects: Effect[] = [];
    if (ab.powerRoll?.length) {
      const rollEffect: Effect = {};
      // Try to extract the bonus from tier labels (not available in old format)
      rollEffect.roll = 0;
      if (ab.powerRoll[0]) rollEffect.tier1 = ab.powerRoll[0].result;
      if (ab.powerRoll[1]) rollEffect.tier2 = ab.powerRoll[1].result;
      if (ab.powerRoll[2]) rollEffect.tier3 = ab.powerRoll[2].result;
      effects.push(rollEffect);
    }
    if (ab.effect) {
      effects.push({ name: 'Effect', effect: ab.effect });
    }
    const feat: Feature = {
      type: 'feature',
      feature_type: 'ability',
      name: ab.name,
      effects,
    };
    if (ab.type) feat.ability_type = ab.type;
    if (ab.action) feat.usage = ab.action;
    if (ab.keywords?.length) feat.keywords = ab.keywords;
    if (ab.distance) feat.distance = ab.distance;
    if (ab.target) feat.target = ab.target;
    features.push(feat);
  }

  for (const tr of m.traits ?? []) {
    features.push({
      type: 'feature',
      feature_type: 'trait',
      name: tr.name,
      effects: [{ effect: tr.description }],
    });
  }

  const monster: Monster = {
    name: m.name,
    level: m.level,
    roles: [m.role],
    ancestry: m.keywords ?? [],
    ev: m.ev,
    stamina: m.stamina,
    speed: m.speed,
    size: m.size,
    stability: m.stability,
    free_strike: m.freeStrike,
    might: m.characteristics?.might ?? 0,
    agility: m.characteristics?.agility ?? 0,
    reason: m.characteristics?.reason ?? 0,
    intuition: m.characteristics?.intuition ?? 0,
    presence: m.characteristics?.presence ?? 0,
    features,
  };
  if (m.movement) monster.movement = m.movement;
  if (m.immunity) monster.immunities = [m.immunity];
  if (m.weakness) monster.weaknesses = [m.weakness];
  return monster;
}
