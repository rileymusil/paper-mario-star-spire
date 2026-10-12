import type { RunState } from '../engine/types';
import { starLevel } from './levels';

/** A permanent Toad Town upgrade bought with Star Pieces between runs. */
export interface PerkDef {
  id: string;
  name: string;
  /** icon id */
  icon: string;
  /** shopkeeper flavor */
  who: string;
  desc: (level: number) => string;
  /** cost of each level */
  costs: number[];
}

export const PERKS: PerkDef[] = [
  { id: 'hp', name: "Merlon's Blessing", icon: 'heart', who: 'Merlon', desc: (n) => `Start runs with +${5 * n} max HP.`, costs: [8, 16, 28] },
  { id: 'coins', name: 'Toad Savings', icon: 'coin', who: 'Toad Bank', desc: (n) => `Start runs with +${25 * n} coins.`, costs: [6, 12, 20] },
  { id: 'item', name: "Tayce T.'s Lunchbox", icon: 'i_supershroom', who: 'Tayce T.', desc: () => 'Start runs with a Super Shroom.', costs: [10] },
  { id: 'star', name: 'Star Spirit Charm', icon: 'starIcon', who: 'Star Haven', desc: () => 'Start runs with +1 max Star Power.', costs: [18] },
  { id: 'badge', name: "Rowf's Starter Badge", icon: 'b_117', who: 'Rowf', desc: () => 'Start runs with a random common badge.', costs: [22] },
  { id: 'remove', name: 'Card Cleanup', icon: 'x', who: 'Toad Town Post Office', desc: () => 'Card removal at shops starts 25 coins cheaper.', costs: [12] },
];

/** Star Pieces a finished run earns: acts cleared, elites and bosses beaten, a win bonus, and Star Level. */
export function starPiecesFor(run: RunState, won: boolean): number {
  const acts = won ? run.act : run.act - 1;
  const base = acts * 2 + run.stats.elites + run.stats.bosses + (won ? 4 : 0);
  return Math.max(1, Math.round(base * (1 + starLevel(run) * 0.1)));
}
