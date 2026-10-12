import type { HeroId, PartnerId, RunState } from './types';
import { RUN_VERSION } from './run';
import { MAX_LEVEL } from '../data/levels';

export interface Settings {
  /** on: timed presses; auto: always Nice!; off: no timing bonus */
  commands: 'on' | 'auto' | 'off';
  speed: 1 | 2;
  sfx: boolean;
}

export interface Meta {
  starters: PartnerId[];
  /** unlocked heroes */
  heroes: HeroId[];
  /** Toad Town currency, earned at the end of each run */
  starPieces: number;
  /** Toad Town perk levels */
  perks: Record<string, number>;
  /** highest Star Level unlocked (0 until the first win) */
  maxLevel: number;
  /** from saves made before Star Levels */
  hardUnlocked?: boolean;
  runs: number;
  wins: number;
  bestAct: number;
  settings: Settings;
}

const RUN_KEY = 'pmspire.run';
const META_KEY = 'pmspire.meta';

export const DEFAULT_META: Meta = {
  starters: ['goombario', 'kooper', 'bombette'],
  heroes: ['mario'],
  starPieces: 0,
  perks: {},
  maxLevel: 0,
  runs: 0,
  wins: 0,
  bestAct: 0,
  settings: { commands: 'on', speed: 1, sfx: true },
};

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // storage full or blocked: the game still works, it just won't resume
  }
}

export function loadMeta(): Meta {
  const m = read<Partial<Meta>>(META_KEY);
  const meta = { ...DEFAULT_META, ...m, settings: { ...DEFAULT_META.settings, ...m?.settings } };
  meta.starters = [...meta.starters];
  meta.heroes = [...meta.heroes];
  meta.perks = { ...meta.perks };
  if (m?.maxLevel === undefined && m?.hardUnlocked) meta.maxLevel = 1;
  return meta;
}

export function saveMeta(m: Meta) {
  write(META_KEY, m);
}

export function loadRun(): RunState | null {
  const r = read<RunState>(RUN_KEY);
  return r && r.version === RUN_VERSION ? r : null;
}

export function saveRun(r: RunState | null) {
  write(RUN_KEY, r);
}

/** Record unlocks after clearing an act (1-3) at a Star Level. Returns names of new unlocks. */
export function unlockForAct(m: Meta, act: number, level = 0): string[] {
  const out: string[] = [];
  m.bestAct = Math.max(m.bestAct, act);
  const add = (p: PartnerId, label: string) => {
    if (!m.starters.includes(p)) {
      m.starters.push(p);
      out.push(label);
    }
  };
  const addHero = (id: HeroId, label: string) => {
    if (!m.heroes.includes(id)) {
      m.heroes.push(id);
      out.push(label);
    }
  };
  if (act >= 1) add('parakarry', 'Parakarry can now be chosen as a starter!');
  if (act >= 2) {
    add('bow', 'Bow can now be chosen as a starter!');
    addHero('peach', 'Princess Peach is now playable!');
  }
  if (act >= 3) {
    add('watt', 'Watt can now be chosen as a starter!');
    addHero('luigi', 'Luigi is now playable!');
    addHero('bowser', 'Bowser is now playable! (His final battle is against Mario.)');
    if (level >= m.maxLevel && m.maxLevel < MAX_LEVEL) {
      m.maxLevel = level + 1;
      out.push(m.maxLevel === 1 ? 'Star Levels unlocked! Pick Star Level 1 for a tougher climb.' : `Star Level ${m.maxLevel} unlocked!`);
    }
  }
  return out;
}
