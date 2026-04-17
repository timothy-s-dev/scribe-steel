// ── Storage types ────────────────────────────────────────────────────────────

export type Category = 'monsters' | 'encounters' | 'letters-and-notes' | 'lore-books';

export interface IndexItem {
  fileId: string;
  name: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface IndexFile {
  version: number;
  items: IndexItem[];
}

// ── Domain types ─────────────────────────────────────────────────────────────

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

export interface SavedDocMetadata {
  updatedAt?: string;
}

export interface SavedMonsterGroup extends SavedDocMetadata {
  version: number;
  name: string;
  malice: Feature[];
  monsters: Monster[];
}

export interface SavedEncounter extends SavedDocMetadata {
  version: number;
  encounter: string;
  objective: string;
  victory: string;
  failure: string;
  malice: { cost: number; name: string; description: string }[];
  groups: {
    label: string;
    creatures: {
      name: string;
      stamina: string;
      stability: number;
      speed: number;
      freeStrike: string;
      distance: string;
      notes: string;
      count?: number;
    }[];
  }[];
  notes: string;
}
