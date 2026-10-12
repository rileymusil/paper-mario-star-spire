import type { CardDef } from '../engine/defs';
import type { HeroId, PartnerId, RunState } from '../engine/types';

export interface HeroDef {
  id: HeroId;
  name: string;
  sprite: string;
  icon: string;
  color: string;
  hp: number;
  deck: string[];
  /** partners that can fight at once */
  partnerSlots: number;
  /** a partner this hero always starts with (skips the partner pick) */
  starter?: PartnerId;
  /** reward card sets: 'plumber' is Mario's original pool */
  sets: string[];
  /** extra display scale for big sprites */
  size?: number;
  blurb: string;
  passive: { name: string; desc: string };
  unlock: string;
  she?: boolean;
}

export const HERO_LIST: HeroDef[] = [
  {
    id: 'mario', name: 'Mario', sprite: 'mario', icon: 'p_mario', color: '#e8382c', hp: 45,
    deck: ['jump', 'jump', 'jump', 'hammer', 'hammer', 'guard', 'guard', 'guard', 'guard'],
    partnerSlots: 2, sets: ['plumber'],
    blurb: 'The hero. Jumps reach anything; hammers hit hard.',
    passive: { name: 'Hero of the Mushroom Kingdom', desc: 'No special rules: Jump, Hammer and up to 2 partners.' },
    unlock: '',
  },
  {
    id: 'luigi', name: 'Luigi', sprite: 'luigi', icon: 'p_luigi', color: '#2f9e44', hp: 40,
    deck: ['jump', 'jump', 'jump', 'scaredyJump', 'hammer', 'guard', 'guard', 'guard', 'guard'],
    partnerSlots: 2, sets: ['plumber', 'luigi'],
    blurb: 'Jumps higher than his bro. Gets stronger when scared.',
    passive: { name: 'Nervous Energy', desc: 'Jumps deal +2 damage, Hammers 2 less. Each time an enemy hurts Luigi he gains 1 Strength (up to 4 per battle).' },
    unlock: 'Win a run to unlock.',
  },
  {
    id: 'peach', name: 'Peach', sprite: 'peach', icon: 'p_peach', color: '#f06aa8', hp: 38, she: true,
    deck: ['parasolSwat', 'parasolSwat', 'parasolSwat', 'parasolSwat', 'parasolGuard', 'parasolGuard', 'parasolGuard', 'parasolGuard', 'peachTea'],
    partnerSlots: 2, sets: ['peach'],
    blurb: 'Parasol fighter. Shields, heals and royal decrees.',
    passive: { name: 'Parasol', desc: 'Peach gains 2 Block at the start of each turn. Her cards are her own: no Jumps or Hammers.' },
    unlock: 'Clear Act 2 to unlock.',
  },
  {
    id: 'bowser', name: 'Bowser', sprite: 'bowser', icon: 'p_bowser', color: '#d9762b', hp: 55, size: 0.6,
    deck: ['bowserClaw', 'bowserClaw', 'bowserClaw', 'bowserClaw', 'bowserShell', 'bowserShell', 'bowserShell', 'bowserShell', 'fireBreath'],
    partnerSlots: 1, starter: 'kammy', sets: ['bowser'],
    blurb: 'Huge HP and fire breath, but only one partner. The final boss is Mario.',
    passive: { name: 'Spiked Shell', desc: 'Enemies that touch Bowser take 2 damage. Fights with Kammy Koopa and just 1 partner at a time.' },
    unlock: 'Defeat Bowser to unlock.',
  },
];

export const HEROES = Object.fromEntries(HERO_LIST.map((h) => [h.id, h])) as Record<HeroId, HeroDef>;

/** A run's hero (saves from before heroes are Mario). */
export function heroOf(run: RunState): HeroDef {
  return HEROES[run.hero ?? 'mario'];
}

/** Can this hero find/use this hero-owned card? Partner cards always pass. */
export function cardFitsHero(card: CardDef, hero: HeroDef): boolean {
  if (card.owner !== 'mario') return true;
  return hero.sets.includes(card.set ?? 'plumber');
}

/** Badges that do nothing for a hero (no Jump/Hammer cards). */
export function badgeFitsHero(id: string, hero: HeroDef): boolean {
  if (hero.id === 'peach') return !['powerJump', 'powerSmash', 'spikeShield'].includes(id);
  if (hero.id === 'bowser') return id !== 'powerSmash';
  return true;
}

let shown: HeroDef | null = null;

/** The hero the UI is currently showing text for (null = Mario). */
export function showHero(hero: HeroDef | null) {
  shown = hero;
}

/** heroize() for the hero currently on screen. */
export function heroText(text: string): string {
  return heroize(text, shown);
}

/** Swap "Mario" (and pronouns, for Peach) in rules text for the run's hero. */
export function heroize(text: string, hero: HeroDef | null | undefined): string {
  if (!hero || hero.id === 'mario') return text;
  let t = text.replace(/\bMario\b/g, hero.name);
  if (hero.she) t = t.replace(/\bhe's\b/g, "she's").replace(/\bhim\b/g, 'her').replace(/\bhis\b/g, 'her').replace(/\bhe\b/g, 'she');
  return t;
}
