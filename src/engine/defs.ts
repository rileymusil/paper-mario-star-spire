import type { AtkKind, CardTarget, CardType, IntentKind, Owner, PartnerId, Rarity, StatusId, Trait, Unit } from './types';
import type { Combat, Ctx } from './combat';

export interface CardDef {
  id: string;
  name: string;
  owner: Owner;
  type: CardType;
  rarity: Rarity;
  cost: number;
  costUp?: number;
  target: CardTarget;
  /** attack reach rules for targeting (jump/ranged can hit flying foes) */
  atk?: AtkKind;
  /** UI animation style */
  anim?: 'jump' | 'hammer' | 'dash' | 'shell' | 'throw' | 'zap' | 'cast' | 'buff' | 'bomb' | 'smack';
  icon: string;
  exhaust?: boolean;
  exhaustUp?: boolean;
  ethereal?: boolean;
  unplayable?: boolean;
  retain?: boolean;
  text: (up: boolean) => string;
  play: (x: Ctx, up: boolean) => void;
  /** curse/status hook while in hand at end of turn */
  endOfTurnInHand?: (c: Combat) => void;
}

export interface MoveDef {
  name: string;
  kind: IntentKind;
  dmg?: number;
  hits?: number;
  tgt?: 'mario' | 'partner' | 'random' | 'all' | 'self' | 'none';
  /** block gained by the enemy */
  block?: number;
  /** statuses applied: [status, amount, to] */
  apply?: [StatusId, number, 'target' | 'self' | 'enemies' | 'allies'][];
  contact?: boolean;
  anim?: 'lunge' | 'jump' | 'shoot' | 'cast' | 'none';
  /** custom effect after damage/statuses */
  fx?: (c: Combat, self: Unit, target: Unit | undefined) => void;
  desc?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  hp: [number, number];
  traits?: Trait[];
  armor?: number;
  /** extra scale multiplier on top of sprite scale */
  size?: number;
  moves: Record<string, MoveDef>;
  ai: (self: Unit, c: Combat) => string;
  init?: (self: Unit, c: Combat) => void;
  onHurt?: (self: Unit, c: Combat, loss: number) => void;
  /** return true if the enemy handled its own death (e.g. Dry Bones collapsing) */
  onDeath?: (self: Unit, c: Combat, how: { pierce?: boolean; fire?: boolean }) => boolean | void;
  desc: string;
}

export interface PartnerDef {
  id: PartnerId;
  name: string;
  sprite: string;
  icon: string;
  hp: number;
  color: string;
  blurb: string;
  starters: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare';
  target: 'ally' | 'enemy' | 'none' | 'koPartner';
  desc: string;
  use: (c: Combat, target: Unit | undefined) => void;
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'boss';
  desc: string;
  /** one-time effect on pickup */
  onGain?: (run: import('./types').RunState) => void;
}

export interface SpecialDef {
  id: string;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  use: (c: Combat) => void;
}

export interface StatusDef {
  id: StatusId;
  name: string;
  icon: string;
  debuff: boolean;
  desc: (n: number) => string;
}
