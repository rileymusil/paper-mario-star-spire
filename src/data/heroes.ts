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
  /** a Partner Quest lead (picked from the Partner Quest button, not the main hero select) */
  quest?: boolean;
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
  // ---------------- Partner Quest leads ----------------
  {
    id: 'link', name: 'Link', sprite: 'link', icon: 'p_link', color: '#3f9b3a', hp: 40, quest: true,
    deck: ['swordSlash', 'swordSlash', 'swordSlash', 'swordSlash', 'hylianShield', 'hylianShield', 'hylianShield', 'hylianShield', 'heroBow'],
    partnerSlots: 2, sets: ['link'],
    blurb: 'Sword, shield and a trusty bow. Spin Attacks and bombs clear crowds.',
    passive: { name: 'Hylian Shield', desc: 'The first enemy hit on Link each turn deals 3 less damage.' },
    unlock: '',
  },
  {
    id: 'fox', name: 'Fox', sprite: 'fox', icon: 'p_fox', color: '#d9902b', hp: 40, quest: true,
    deck: ['foxBlaster', 'foxBlaster', 'foxBlaster', 'foxBlaster', 'reflector', 'reflector', 'reflector', 'reflector', 'barrelRoll'],
    partnerSlots: 2, sets: ['fox'],
    blurb: 'Blaster pilot. Ranged shots, Smart Bombs and Arwing strikes.',
    passive: { name: 'Reflector', desc: 'When an enemy hits Fox while he has Block, it takes 2 damage.' },
    unlock: '',
  },
  {
    id: 'geno', name: 'Geno', sprite: 'geno', icon: 'p_geno', color: '#2f55c8', hp: 38, quest: true,
    deck: ['fingerShot', 'fingerShot', 'fingerShot', 'fingerShot', 'starGuard', 'starGuard', 'starGuard', 'starGuard', 'genoBoost'],
    partnerSlots: 2, sets: ['geno'],
    blurb: 'Star warrior. Charges up and unloads Geno Beams.',
    passive: { name: 'Star Charge', desc: 'Geno gains 2 Charge at the start of each turn (his next attack deals that much more).' },
    unlock: '',
  },
  {
    id: 'banjo', name: 'Banjo & Kazooie', sprite: 'banjo', icon: 'p_banjo', color: '#8a5a2b', hp: 40, size: 0.8, quest: true,
    deck: ['beakBarge', 'beakBarge', 'beakBarge', 'beakBarge', 'bearBlock', 'bearBlock', 'bearBlock', 'bearBlock', 'eggFiring'],
    partnerSlots: 2, sets: ['banjo'],
    blurb: 'Bear and bird duo. Beak Barges, egg volleys and Beak Busters.',
    passive: { name: 'Wonderwing', desc: 'Once per battle, a hit that would KO Banjo & Kazooie leaves them at 1 HP instead.' },
    unlock: '',
  },
  {
    id: 'ashley', name: 'Ashley', sprite: 'ashley', icon: 'p_ashley', color: '#c23a2a', hp: 36, quest: true, she: true,
    deck: ['wandBolt', 'wandBolt', 'wandBolt', 'wandBolt', 'magicBarrier', 'magicBarrier', 'magicBarrier', 'magicBarrier', 'spellbook'],
    partnerSlots: 2, sets: ['ashley'],
    blurb: 'Young witch with a wand. Curses, hexes and a very bad temper.',
    passive: { name: 'Red Rage', desc: 'The first time Ashley drops to half HP in a battle she transforms: +3 Strength for the rest of the fight.' },
    unlock: '',
  },
  {
    id: 'wario', name: 'Wario', sprite: 'wario', icon: 'p_wario', color: '#e0b81c', hp: 44, quest: true,
    deck: ['shoulderBash', 'shoulderBash', 'shoulderBash', 'shoulderBash', 'toughGuy', 'toughGuy', 'toughGuy', 'toughGuy', 'coinGrab'],
    partnerSlots: 2, sets: ['wario'],
    blurb: 'Greedy brawler. Coins make him hit harder.',
    passive: { name: 'Greed', desc: "Wario's attacks deal +1 damage for every 50 coins you carry (up to +4)." },
    unlock: '',
  },
  {
    id: 'waluigi', name: 'Waluigi', sprite: 'waluigi', icon: 'p_waluigi', color: '#6a3fb0', hp: 36, quest: true,
    deck: ['whirluigi', 'whirluigi', 'whirluigi', 'whirluigi', 'wahDodge', 'wahDodge', 'wahDodge', 'wahDodge', 'cheapShot'],
    partnerSlots: 2, sets: ['waluigi'],
    blurb: 'Sneaky trickster. Steals buffs and plays dirty.',
    passive: { name: 'Cheater', desc: "Waluigi's attacks ignore half of an enemy's Block." },
    unlock: '',
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
  // Banjo (Beak Buster) and Wario (Ground Pound) have Jump attacks; the other leads don't.
  if (hero.quest) return id !== 'powerSmash' && (['banjo', 'wario'].includes(hero.id) || !['powerJump', 'spikeShield'].includes(id));
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
