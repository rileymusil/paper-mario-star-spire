export type PartnerId = 'goombario' | 'kooper' | 'bombette' | 'parakarry' | 'bow' | 'watt' | 'sushie' | 'lakilester';
export type Owner = 'mario' | PartnerId | 'none';
export type Side = 'ally' | 'enemy';

export type StatusId =
  | 'strength' // +N damage per hit
  | 'pumped' // +N damage per hit, this turn only
  | 'charge' // next attack's first hit +N
  | 'shrunk' // deal 25% less damage (turns)
  | 'soft' // take 50% more damage (turns)
  | 'burn' // lose N HP at start of turn, then N-1
  | 'dizzy' // skip next action (turns)
  | 'sleep' // skip actions; woken by damage
  | 'flipped' // shelled foe on its back: no armor, skips next action
  | 'static' // contact attackers take N
  | 'hidden' // attacks against this unit miss until its next turn
  | 'vanish' // each hit deals at most 1 until its next turn
  | 'regen' // heal N at end of turn, then N-1
  | 'chill' // ally: -N FP next turn
  | 'growth'; // gain N strength at end of each turn

export type Trait = 'flying' | 'winged' | 'spiky' | 'shelled' | 'boss' | 'explosive' | 'minion' | 'undead' | 'bigShell';

/** How an attack reaches its target. Jump/ranged hit flying foes; hammer/ground can't. */
export type AtkKind = 'jump' | 'hammer' | 'ground' | 'ranged';

export type IntentKind =
  | 'attack'
  | 'buff'
  | 'debuff'
  | 'defend'
  | 'summon'
  | 'heal'
  | 'sleep'
  | 'escape'
  | 'unknown'
  | 'explode'
  | 'stunned';

export interface Intent {
  move: string;
  name: string;
  kind: IntentKind;
  dmg?: number;
  hits?: number;
  /** ally uid, or 'all' for every ally */
  target?: string;
  /** turns until it happens, shown for countdown moves */
  countdown?: number;
}

export interface Unit {
  uid: string;
  side: Side;
  id: string;
  name: string;
  sprite: string;
  /** base animation while idle: idle | flipped | hang | pile | lit ... */
  pose: string;
  hp: number;
  maxHp: number;
  block: number;
  armor: number;
  st: Partial<Record<StatusId, number>>;
  traits: Trait[];
  dead: boolean;
  intent?: Intent;
  /** enemy AI memory */
  mem: Record<string, any>;
}

export interface CardInst {
  uid: string;
  id: string;
  up: boolean;
  /** combat-only: costs 0 this turn */
  free?: boolean;
}

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type CardTarget = 'enemy' | 'allEnemies' | 'ally' | 'self' | 'none';

export interface PartnerState {
  id: PartnerId;
  hp: number;
  maxHp: number;
  rank: 0 | 1 | 2;
  field: boolean;
}

export type NodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'partner' | 'boss';

export interface MapNode {
  id: string;
  floor: number;
  col: number;
  type: NodeType;
  next: string[];
  /** fixed visual jitter */
  jx: number;
  jy: number;
}

export interface MapData {
  floors: number;
  nodes: Record<string, MapNode>;
  starts: string[];
}

export interface RunStats {
  battles: number;
  elites: number;
  bosses: number;
  damageDealt: number;
  nice: number;
  coinsEarned: number;
}

export interface RunState {
  version: number;
  seed: string;
  rng: Record<string, number>;
  act: number;
  map: MapData;
  /** node id Mario is standing on (completed), or null at act start */
  pos: string | null;
  /** node currently being resolved; on reload the node restarts */
  current: string | null;
  visited: string[];
  mario: { hp: number; maxHp: number };
  partners: PartnerState[];
  deck: CardInst[];
  coins: number;
  items: (string | null)[];
  badges: string[];
  superBlocks: number;
  starMax: number;
  specials: string[];
  bosses: string[];
  /** event ids already seen this run */
  seenEvents: string[];
  removeCost: number;
  hard: boolean;
  nextUid: number;
  stats: RunStats;
  /** pending reward/screen state so reloads resume where they left off */
  screen: ScreenState;
  /** next N combats start with 2 extra star points */
  paradeBuff: number;
  actFights: number;
  lastEncounter: string;
}

export type ScreenState =
  | { kind: 'map' }
  | { kind: 'battle'; node: string; enemies: string[]; fight: 'normal' | 'elite' | 'boss'; bg: string }
  | { kind: 'reward'; reward: Reward }
  | { kind: 'event'; node: string; event: string; step: string; data?: any }
  | { kind: 'shop'; node: string; stock: ShopStock }
  | { kind: 'rest'; node: string; used: boolean }
  | { kind: 'treasure'; node: string; reward: Reward }
  | { kind: 'partner'; node: string; offer: PartnerId[] }
  | { kind: 'bossReward'; choices: BossChoice[]; reward: Reward; picked?: number }
  | { kind: 'actIntro' }
  | { kind: 'victory' }
  | { kind: 'gameover' };

export interface Reward {
  coins: number;
  cards: string[][]; // each entry: a choice of card ids (pick one)
  items: string[];
  badges: string[];
  superBlocks: number;
  /** which parts are already claimed */
  taken: { coins?: boolean; cards: boolean[]; items: boolean[]; badges: boolean[]; superBlocks?: boolean };
  upgradedCards?: boolean;
}

export type BossChoice =
  | { kind: 'partner'; id: PartnerId }
  | { kind: 'rankup' }
  | { kind: 'badge'; id: string };

export interface ShopStock {
  cards: { id: string; price: number; sold: boolean }[];
  items: { id: string; price: number; sold: boolean }[];
  badges: { id: string; price: number; sold: boolean }[];
  superBlock: { price: number; sold: boolean } | null;
  removeUsed: boolean;
}

export type CEvent =
  | { t: 'hit'; target: string; src?: string; dmg: number; blocked: number; miss?: boolean; guarded?: boolean; nice?: boolean }
  | { t: 'block'; target: string; n: number }
  | { t: 'heal'; target: string; n: number }
  | { t: 'status'; target: string; id: StatusId; n: number }
  | { t: 'die'; target: string }
  | { t: 'revive'; target: string }
  | { t: 'summon'; target: string }
  | { t: 'pose'; target: string; pose: string; sprite?: string }
  | { t: 'text'; target?: string; text: string; color?: string }
  | { t: 'flee'; target: string }
  | { t: 'fp'; n: number }
  | { t: 'star'; n: number }
  | { t: 'coins'; n: number }
  | { t: 'cards' };
