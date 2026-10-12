import type { PartnerDef } from '../engine/defs';
import type { PartnerId } from '../engine/types';

export const PARTNER_LIST: PartnerDef[] = [
  { id: 'goombario', name: 'Goombario', sprite: 'goombario', icon: 'p_goombario', hp: 18, color: '#b0703a', blurb: 'Scout. Softens foes, draws cards, bonks twice.', starters: ['headbonk', 'tattle'],
    passive: { name: 'Scout', values: [1, 1, 2], desc: (n) => `Draw ${n} extra card${n > 1 ? 's' : ''} on the first turn of each battle.` } },
  { id: 'kooper', name: 'Kooper', sprite: 'kooper', icon: 'p_kooper', hp: 22, color: '#3d7bd6', blurb: 'Shell tank. Guards Mario and bowls over ground foes.', starters: ['shellToss', 'shellShield'],
    passive: { name: 'Shell Guard', values: [2, 3, 4], desc: (n) => `At the end of your turn, Mario gains ${n} Block.` } },
  { id: 'bombette', name: 'Bombette', sprite: 'bombette', icon: 'p_bombette', hp: 18, color: '#d0509a', blurb: 'Demolition. Armor-piercing blasts that hit everyone.', starters: ['bodySlam', 'bomb'],
    passive: { name: 'Blast Radius', values: [2, 3, 4], desc: (n) => `Whenever an enemy is defeated, deal ${n} damage to ALL enemies.` } },
  { id: 'parakarry', name: 'Parakarry', sprite: 'parakarry', icon: 'p_parakarry', hp: 18, color: '#d98a2b', blurb: 'Mailman. Card draw and dive-bombs on flyers.', starters: ['skyDive', 'airMail'],
    passive: { name: 'Airmail', values: [1, 1, 2], desc: (n) => `Every 3rd turn, draw ${n} extra card${n > 1 ? 's' : ''}.` } },
  { id: 'bow', name: 'Bow', sprite: 'bow', icon: 'p_bow', hp: 20, color: '#55b98a', blurb: 'Boo noble. Flurries of slaps and hides Mario.', starters: ['smack', 'outtaSight'],
    passive: { name: 'Veil', values: [10, 15, 20], desc: (n) => `Enemy attacks on Mario have a ${n}% chance to miss.` } },
  { id: 'watt', name: 'Watt', sprite: 'watt', icon: 'p_watt', hp: 16, color: '#e2b51c', blurb: 'Li\'l Sparky. Pierces armor and powers up the team.', starters: ['electroDash', 'powerShock'],
    passive: { name: 'Spark', values: [1, 2, 3], desc: (n) => `Mario starts each battle with ${n} Static.` } },
  { id: 'sushie', name: 'Sushie', sprite: 'sushie', icon: 'p_sushie', hp: 22, color: '#8a55c2', blurb: 'Cheep Cheep nanny. Team block, healing, belly flops.', starters: ['bellyFlop', 'waterBlock'],
    passive: { name: 'Nanny', values: [2, 3, 4], desc: (n) => `At the start of your turn, heal the most-hurt ally ${n} HP.` } },
  { id: 'lakilester', name: 'Lakilester', sprite: 'lakilester', icon: 'p_lakilester', hp: 24, color: '#4fb6e6', blurb: 'Cloud rider. Spiny storms and crowd control.', starters: ['spinyFlip', 'cloudNine'],
    passive: { name: 'Spiny Cloud', values: [1, 2, 3], desc: (n) => `At the start of each battle, Shrink ${n} random enem${n > 1 ? 'ies' : 'y'} (1 turn).` } },
];

export const RANK_NAMES = ['Normal', 'Super', 'Ultra'];
export const RANK_HP = 6;

/** "Name: what it does" for a partner's passive at a rank. */
export function passiveText(p: PartnerDef, rank: number): string {
  return `${p.passive.name}: ${p.passive.desc(p.passive.values[rank] ?? p.passive.values[0])}`;
}

export const ALL_PARTNERS: PartnerId[] = PARTNER_LIST.map((p) => p.id);
