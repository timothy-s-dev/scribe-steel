export interface Effect {
  roll?: number;
  tier1?: string;
  tier2?: string;
  tier3?: string;
  name?: string;
  effect?: string;
  cost?: string;
}

export interface Feature {
  type: "feature";
  feature_type: "ability" | "trait";
  name: string;
  icon?: string;
  ability_type?: string;
  keywords?: string[];
  usage?: string;
  distance?: string;
  target?: string;
  trigger?: string;
  cost?: string;
  effects: Effect[];
}

export interface Monster {
  name: string;
  level: number;
  roles: string[];
  ancestry: string[];
  ev: number | null;
  stamina: number;
  speed: number;
  movement?: string;
  size: string;
  stability: number;
  free_strike: number;
  with_captain?: string;
  might: number;
  agility: number;
  reason: number;
  intuition: number;
  presence: number;
  immunities?: string[];
  weaknesses?: string[];
  features: Feature[];
}

export interface MonsterGroup {
  name: string;
  malice: Feature[];
  monsters: Monster[];
}

export interface Bestiary {
  groups: MonsterGroup[];
}

export interface SavedMonsterGroup {
  version: number;
  name: string;
  malice: Feature[];
  monsters: Monster[];
}
