import type { BadgeDef, ItemDef, SpecialDef, StatusDef } from '../engine/defs';

export const STATUS_LIST: StatusDef[] = [
  { id: 'strength', name: 'Strength', icon: 'arrowUp', debuff: false, desc: (n) => `Attacks deal ${n} more damage per hit.` },
  { id: 'pumped', name: 'Pumped', icon: 'arrowUp', debuff: false, desc: (n) => `Attacks deal ${n} more damage per hit this turn.` },
  { id: 'charge', name: 'Charge', icon: 'st_charge', debuff: false, desc: (n) => `Next attack deals ${n} more damage.` },
  { id: 'static', name: 'Static', icon: 'st_static', debuff: false, desc: (n) => `Foes that touch this unit take ${n} damage.` },
  { id: 'hidden', name: 'Hidden', icon: 'b_162', debuff: false, desc: () => `Attacks against this unit miss until its next turn.` },
  { id: 'vanish', name: 'Vanished', icon: 'b_162', debuff: false, desc: () => `Each hit deals at most 1 damage until its next turn.` },
  { id: 'regen', name: 'Regen', icon: 'heart', debuff: false, desc: (n) => `Heal ${n} at end of turn, then 1 less.` },
  { id: 'growth', name: 'Ritual', icon: 'arrowUpBlue', debuff: false, desc: (n) => `Gains ${n} Strength at the end of each turn.` },
  { id: 'shrunk', name: 'Shrunk', icon: 'st_shrink', debuff: true, desc: (n) => `Deals 25% less damage for ${n} turn(s).` },
  { id: 'soft', name: 'Soft', icon: 'st_poison', debuff: true, desc: (n) => `Takes 50% more damage for ${n} turn(s).` },
  { id: 'burn', name: 'Burn', icon: 'fireflower', debuff: true, desc: (n) => `Loses ${n} HP at the start of its turn, then 1 less.` },
  { id: 'dizzy', name: 'Dizzy', icon: 'st_dizzy', debuff: true, desc: (n) => `Skips its next ${n} action(s). A dizzy partner can't play cards.` },
  { id: 'sleep', name: 'Asleep', icon: 'st_sleep', debuff: true, desc: (n) => `Skips up to ${n} action(s). Wakes when hurt.` },
  { id: 'flipped', name: 'Flipped', icon: 'x', debuff: true, desc: () => `On its back: no armor, spends its turn getting up.` },
  { id: 'chill', name: 'Chilled', icon: 'st_frozen', debuff: true, desc: (n) => `Lose ${n} FP next turn.` },
];

export const KEYWORDS: Record<string, string> = {
  Jump: 'Jump attacks reach Flying foes, flip Shelled foes, and knock wings off Paragoombas. Jumping on Spiky foes hurts!',
  Hammer: "Hammer attacks can't reach Flying foes.",
  Pierce: 'Ignores armor (DEF).',
  Flip: 'Flipped foes lose their armor and spend their next turn getting up.',
  Shelled: 'Has armor (DEF) that reduces each hit. Flip it to remove the armor.',
  Flying: "Hammer and ground attacks can't reach it.",
  Spiky: 'Jumping on it hurts the jumper for 3.',
  Block: 'Absorbs damage until your next turn.',
  'Star Power': 'Spend Star Power on Star Spirit specials. Gain it from Nice! timing and each turn.',
  Strength: 'Each hit deals more damage.',
  Pumped: 'Each hit deals more damage this turn.',
  Charge: 'The next attack deals more damage.',
  Shrunk: 'Deals 25% less damage.',
  Soft: 'Takes 50% more damage.',
  Burn: 'Loses HP at the start of its turn.',
  Dizzy: 'Skips its next action.',
  Sleep: 'Skips actions until hurt.',
  Static: 'Foes that touch it take damage.',
  Hidden: 'Attacks against it miss.',
};

export const ITEM_LIST: ItemDef[] = [
  { id: 'mushroom', name: 'Mushroom', icon: 'i_mushroom', rarity: 'common', target: 'ally', desc: 'Heal an ally 10 HP.', use: (c, t) => t && c.heal(t, 10) },
  { id: 'supershroom', name: 'Super Shroom', icon: 'i_supershroom', rarity: 'uncommon', target: 'ally', desc: 'Heal an ally 20 HP.', use: (c, t) => t && c.heal(t, 20) },
  { id: 'ultrashroom', name: 'Ultra Shroom', icon: 'i_ultrashroom', rarity: 'rare', target: 'ally', desc: 'Heal an ally 40 HP.', use: (c, t) => t && c.heal(t, 40) },
  {
    id: 'lifeshroom', name: 'Life Shroom', icon: 'i_lifeshroom', rarity: 'rare', target: 'koPartner',
    desc: "Revive a KO'd partner at half HP. If Mario falls while you hold it, he's revived instead.",
    use: (c, t) => t && c.revive(t, 0.5),
  },
  { id: 'honey', name: 'Honey Syrup', icon: 'i_honey', rarity: 'common', target: 'none', desc: 'Gain 2 FP.', use: (c) => c.gainFp(2) },
  {
    id: 'maple', name: 'Maple Syrup', icon: 'i_maple', rarity: 'uncommon', target: 'none', desc: 'Gain 3 FP. Draw 1 card.',
    use: (c) => {
      c.gainFp(3);
      c.draw(1);
    },
  },
  {
    id: 'jelly', name: "Jammin' Jelly", icon: 'i_jelly', rarity: 'rare', target: 'none', desc: 'Gain 3 FP. Draw 3 cards.',
    use: (c) => {
      c.gainFp(3);
      c.draw(3);
    },
  },
  {
    id: 'fireflower', name: 'Fire Flower', icon: 'i_fireflower', rarity: 'common', target: 'none', desc: 'Deal 7 damage to ALL enemies and apply Burn 2.',
    use: (c) => {
      for (const e of c.livingEnemies()) {
        c.attack(undefined, e, 7, { contact: false, fire: true }, false);
        c.applyStatus(e, 'burn', 2);
      }
    },
  },
  {
    id: 'snowman', name: 'Snowman Doll', icon: 'i_snowman', rarity: 'common', target: 'none', desc: 'Deal 9 damage to ALL enemies.',
    use: (c) => {
      for (const e of c.livingEnemies()) c.attack(undefined, e, 9, { contact: false }, false);
    },
  },
  { id: 'thunderbolt', name: 'Thunder Bolt', icon: 'i_thunderbolt', rarity: 'common', target: 'enemy', desc: 'Deal 15 damage to an enemy. Pierce.', use: (c, t) => t && c.attack(undefined, t, 15, { pierce: true, contact: false }, false) },
  {
    id: 'thunderrage', name: 'Thunder Rage', icon: 'i_thunderrage', rarity: 'rare', target: 'none', desc: 'Deal 13 damage to ALL enemies. Pierce.',
    use: (c) => {
      for (const e of c.livingEnemies()) c.attack(undefined, e, 13, { pierce: true, contact: false }, false);
    },
  },
  {
    id: 'pow', name: 'POW Block', icon: 'i_pow', rarity: 'common', target: 'none', desc: 'Deal 6 damage to all ground enemies and flip Shelled ones.',
    use: (c) => {
      for (const e of c.livingEnemies()) {
        if (e.traits.includes('flying')) continue;
        c.attack(c.mario, e, 6, { kind: 'ground', flip: true, contact: false }, false);
      }
    },
  },
  {
    id: 'sheep', name: 'Sleepy Sheep', icon: 'i_sheep', rarity: 'uncommon', target: 'none', desc: 'Put ALL non-boss enemies to Sleep (2).',
    use: (c) => {
      for (const e of c.livingEnemies()) c.applyStatus(e, 'sleep', 2);
    },
  },
  {
    id: 'dizzydial', name: 'Dizzy Dial', icon: 'i_dizzy', rarity: 'uncommon', target: 'none', desc: 'Apply Dizzy 1 to ALL non-boss enemies.',
    use: (c) => {
      for (const e of c.livingEnemies()) c.applyStatus(e, 'dizzy', 1);
    },
  },
  { id: 'stonecap', name: 'Stone Cap', icon: 'i_stonecap', rarity: 'uncommon', target: 'none', desc: 'Mario gains 20 Block.', use: (c) => c.gainBlock(c.mario, 20) },
  { id: 'voltshroom', name: 'Volt Shroom', icon: 'i_voltshroom', rarity: 'common', target: 'ally', desc: 'An ally gains 4 Static.', use: (c, t) => t && c.applyStatus(t, 'static', 4) },
  { id: 'coconut', name: 'Coconut', icon: 'i_coconut', rarity: 'common', target: 'enemy', desc: 'Deal 10 damage to an enemy.', use: (c, t) => t && c.attack(undefined, t, 10, { contact: false }, false) },
  {
    id: 'tonic', name: 'Tasty Tonic', icon: 'i_tonic', rarity: 'common', target: 'none', desc: 'Remove all debuffs from your team. Draw 2 cards.',
    use: (c) => {
      for (const a of c.livingAllies()) c.removeDebuffs(a);
      c.draw(2);
    },
  },
  {
    id: 'shootingstar', name: 'Shooting Star', icon: 'i_shootingstar', rarity: 'rare', target: 'none', desc: 'Deal 6 damage to ALL enemies twice. Gain 2 Star Power.',
    use: (c) => {
      for (const e of c.livingEnemies()) c.attack(undefined, e, 6, { hits: 2, contact: false }, false);
      c.gainStar(2);
    },
  },
  {
    id: 'cake', name: 'Cake', icon: 'i_cake', rarity: 'uncommon', target: 'none', desc: 'Heal every ally 10 HP.',
    use: (c) => {
      for (const a of c.livingAllies()) c.heal(a, 10);
    },
  },
];

export const BADGE_LIST: BadgeDef[] = [
  // common
  { id: 'powerPlus', name: 'Power Plus', icon: 'b_117', rarity: 'common', desc: "Mario's attacks deal 1 more damage per hit." },
  { id: 'defendPlus', name: 'Defend Plus', icon: 'b_238', rarity: 'common', desc: 'Mario starts each battle with 6 Block.' },
  { id: 'hpPlus', name: 'HP Plus', icon: 'b_118', rarity: 'common', desc: 'Mario gets +10 max HP.', onGain: (r) => { r.mario.maxHp += 10; r.mario.hp += 10; } },
  { id: 'happyHeart', name: 'Happy Heart', icon: 'b_232', rarity: 'common', desc: 'Heal Mario 1 HP at the start of each turn.' },
  { id: 'happyFlower', name: 'Happy Flower', icon: 'b_233', rarity: 'common', desc: 'Every 3rd turn, gain 1 extra FP.' },
  { id: 'moneyMoney', name: 'Money Money', icon: 'b_227', rarity: 'common', desc: 'Battles give 40% more coins.' },
  { id: 'spikeShield', name: 'Spike Shield', icon: 'b_245', rarity: 'common', desc: "Mario can Jump on Spiky foes without getting hurt." },
  { id: 'fireShield', name: 'Fire Shield', icon: 'b_247', rarity: 'common', desc: 'Mario is immune to Burn.' },
  { id: 'dodgeMaster', name: 'Dodge Master', icon: 'b_237', rarity: 'common', desc: 'Action Command timing windows are much wider.' },
  { id: 'firstAttack', name: 'First Attack', icon: 'b_115', rarity: 'common', desc: 'Draw 2 extra cards on the first turn of each battle.' },
  { id: 'heartFinder', name: 'Heart Finder', icon: 'b_230', rarity: 'common', desc: 'Heal your whole team 5 HP after each battle.' },
  { id: 'damageDodge', name: 'Damage Dodge', icon: 'b_243', rarity: 'common', desc: 'Partners start each battle with 5 Block.' },
  { id: 'powerJump', name: 'Jump Charge', icon: 'b_122', rarity: 'common', desc: "Mario's Jump attacks deal 2 more damage." },
  { id: 'powerSmash', name: 'Smash Charge', icon: 'b_228', rarity: 'common', desc: "Mario's Hammer attacks deal 2 more damage." },
  // uncommon
  { id: 'zapTap', name: 'Zap Tap', icon: 'b_119', rarity: 'uncommon', desc: 'Mario starts each battle with 2 Static.' },
  { id: 'lastStand', name: 'Last Stand', icon: 'b_235', rarity: 'uncommon', desc: "While Mario is at 30% HP or less, his attacks deal 3 more damage." },
  { id: 'itemBag', name: 'Item Bag', icon: 'b_248', rarity: 'uncommon', desc: 'Carry 1 more item.', onGain: (r) => { r.items.push(null); } },
  { id: 'refund', name: 'Refund', icon: 'b_226', rarity: 'uncommon', desc: 'Gain 5 coins whenever you use an item.' },
  { id: 'feelingFine', name: 'Feeling Fine', icon: 'b_249', rarity: 'uncommon', desc: 'Your team is immune to Shrunk.' },
  { id: 'attackFx', name: 'Attack FX', icon: 'b_159', rarity: 'uncommon', desc: 'Nice! timing adds 1 more damage.' },
  { id: 'deepFocus', name: 'Deep Focus', icon: 'b_239', rarity: 'uncommon', desc: '+2 max Star Power.' },
  { id: 'prettyLucky', name: 'Pretty Lucky', icon: 'b_246', rarity: 'uncommon', desc: 'Enemy attacks have a 10% chance to miss.' },
  // rare
  { id: 'megaRush', name: 'Mega Rush', icon: 'b_229', rarity: 'rare', desc: 'Mario starts each battle with 2 Strength.' },
  { id: 'luckyStar', name: 'Lucky Star', icon: 'b_252', rarity: 'rare', desc: 'Start each battle with 3 Star Power.' },
  { id: 'chillOut', name: 'Chill Out', icon: 'b_244', rarity: 'rare', desc: 'Enemies start each battle Shrunk.' },
  { id: 'pUpDDown', name: 'P-Up, D-Down', icon: 'b_160', rarity: 'rare', desc: 'Your team deals 1 more damage per hit, and takes 1 more per hit.' },
  // boss
  { id: 'fpPlus', name: 'FP Plus', icon: 'b_113', rarity: 'boss', desc: 'Gain 1 extra FP every turn.' },
];

export const SPECIAL_LIST: SpecialDef[] = [
  {
    id: 'refresh', name: 'Refresh', icon: 'spirit1', cost: 2, desc: 'Heal every ally 8 HP and remove their debuffs.',
    use: (c) => {
      for (const a of c.livingAllies()) {
        c.removeDebuffs(a);
        c.heal(a, 8);
      }
    },
  },
  {
    id: 'lullaby', name: 'Lullaby', icon: 'spirit2', cost: 3, desc: 'Put ALL non-boss enemies to Sleep (2).',
    use: (c) => {
      for (const e of c.livingEnemies()) c.applyStatus(e, 'sleep', 2);
    },
  },
  {
    id: 'starStorm', name: 'Star Storm', icon: 'spirit3', cost: 4, desc: 'Deal 12 damage to ALL enemies. Pierce.',
    use: (c) => {
      for (const e of c.livingEnemies()) c.attack(undefined, e, 12, { pierce: true, contact: false }, false);
    },
  },
  {
    id: 'chillOutStar', name: 'Chill Out', icon: 'spirit4', cost: 3, desc: 'Apply Shrunk 2 and Soft 2 to ALL enemies.',
    use: (c) => {
      for (const e of c.livingEnemies()) {
        c.applyStatus(e, 'shrunk', 2);
        c.applyStatus(e, 'soft', 2);
      }
    },
  },
];
