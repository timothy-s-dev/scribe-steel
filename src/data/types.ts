export interface PowerRollTier {
  tier: string;
  result: string;
}

export interface Ability {
  name: string;
  type?: string;
  action?: string;
  keywords?: string[];
  distance?: string;
  target?: string;
  damage?: string;
  powerRoll?: PowerRollTier[];
  effect?: string;
}

export interface Trait {
  name: string;
  description: string;
}

export interface Characteristics {
  might: number;
  agility: number;
  reason: number;
  intuition: number;
  presence: number;
}

export interface Monster {
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
  characteristics: Characteristics;
  abilities: Ability[];
  traits: Trait[];
}

export interface MaliceFeature {
  cost: number;
  name: string;
  description: string;
}

export interface Faction {
  name: string;
  malice: MaliceFeature[];
  monsters: Monster[];
}

export interface Bestiary {
  factions: Faction[];
}
