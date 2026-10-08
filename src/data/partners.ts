import type { PartnerDef } from '../engine/defs';
import type { PartnerId } from '../engine/types';

export const PARTNER_LIST: PartnerDef[] = [
  { id: 'goombario', name: 'Goombario', sprite: 'goombario', icon: 'p_goombario', hp: 18, color: '#b0703a', blurb: 'Scout. Softens foes, draws cards, bonks twice.', starters: ['headbonk', 'tattle'] },
  { id: 'kooper', name: 'Kooper', sprite: 'kooper', icon: 'p_kooper', hp: 22, color: '#3d7bd6', blurb: 'Shell tank. Guards Mario and bowls over ground foes.', starters: ['shellToss', 'shellShield'] },
  { id: 'bombette', name: 'Bombette', sprite: 'bombette', icon: 'p_bombette', hp: 18, color: '#d0509a', blurb: 'Demolition. Armor-piercing blasts that hit everyone.', starters: ['bodySlam', 'bomb'] },
  { id: 'parakarry', name: 'Parakarry', sprite: 'parakarry', icon: 'p_parakarry', hp: 18, color: '#d98a2b', blurb: 'Mailman. Card draw and dive-bombs on flyers.', starters: ['skyDive', 'airMail'] },
  { id: 'bow', name: 'Bow', sprite: 'bow', icon: 'p_bow', hp: 20, color: '#55b98a', blurb: 'Boo noble. Flurries of slaps and hides Mario.', starters: ['smack', 'outtaSight'] },
  { id: 'watt', name: 'Watt', sprite: 'watt', icon: 'p_watt', hp: 16, color: '#e2b51c', blurb: 'Li\'l Sparky. Pierces armor and powers up the team.', starters: ['electroDash', 'powerShock'] },
  { id: 'sushie', name: 'Sushie', sprite: 'sushie', icon: 'p_sushie', hp: 22, color: '#8a55c2', blurb: 'Cheep Cheep nanny. Team block, healing, belly flops.', starters: ['bellyFlop', 'waterBlock'] },
  { id: 'lakilester', name: 'Lakilester', sprite: 'lakilester', icon: 'p_lakilester', hp: 24, color: '#4fb6e6', blurb: 'Cloud rider. Spiny storms and crowd control.', starters: ['spinyFlip', 'cloudNine'] },
];

export const RANK_NAMES = ['Normal', 'Super', 'Ultra'];
export const RANK_HP = 6;

export const ALL_PARTNERS: PartnerId[] = PARTNER_LIST.map((p) => p.id);
