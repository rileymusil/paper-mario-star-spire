import type { CardDef } from '../engine/defs';

const v = (up: boolean, a: number, b: number) => (up ? b : a);

/** Rules text uses [Keyword] markup for tooltips and {n} highlights. */
export const CARD_LIST: CardDef[] = [
  // ---------------- Mario: starters ----------------
  {
    id: 'jump', name: 'Jump', owner: 'mario', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots',
    text: (up) => `Deal {${v(up, 5, 8)}} damage. [Jump]`,
    play: (x, up) => void x.attack(v(up, 5, 8), { kind: 'jump' }),
  },
  {
    id: 'hammer', name: 'Hammer', owner: 'mario', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'hammer', anim: 'hammer', icon: 'hammer',
    text: (up) => `Deal {${v(up, 6, 9)}} damage. [Hammer]`,
    play: (x, up) => void x.attack(v(up, 6, 9), { kind: 'hammer' }),
  },
  {
    id: 'guard', name: 'Guard', owner: 'mario', type: 'skill', rarity: 'starter', cost: 1, target: 'none', anim: 'buff', icon: 'b_238',
    text: (up) => `Mario gains {${v(up, 5, 8)}} [Block].`,
    play: (x, up) => x.block(v(up, 5, 8)),
  },
  // ---------------- Mario: common ----------------
  {
    id: 'powerJump', name: 'Power Jump', owner: 'mario', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b2',
    text: (up) => `Deal {${v(up, 12, 16)}} damage. [Jump]`,
    play: (x, up) => void x.attack(v(up, 12, 16), { kind: 'jump' }),
  },
  {
    id: 'powerSmash', name: 'Power Smash', owner: 'mario', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', atk: 'hammer', anim: 'hammer', icon: 'hammer_b2',
    text: (up) => `Deal {${v(up, 14, 19)}} damage. [Hammer]`,
    play: (x, up) => void x.attack(v(up, 14, 19), { kind: 'hammer' }),
  },
  {
    id: 'multibounce', name: 'Multibounce', owner: 'mario', type: 'attack', rarity: 'common', cost: 2, target: 'allEnemies', atk: 'jump', anim: 'jump', icon: 'boots_b3',
    text: (up) => `Bounce on every enemy for {${v(up, 5, 7)}} damage. [Jump]`,
    play: (x, up) => void x.attackAll(v(up, 5, 7), { kind: 'jump' }),
  },
  {
    id: 'hammerThrow', name: 'Hammer Throw', owner: 'mario', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'hammer3',
    text: (up) => `Deal {${v(up, 7, 10)}} damage. Reaches [Flying] foes.`,
    play: (x, up) => void x.attack(v(up, 7, 10), { kind: 'ranged', contact: false }),
  },
  {
    id: 'quakeHammer', name: 'Quake Hammer', owner: 'mario', type: 'attack', rarity: 'common', cost: 2, target: 'allEnemies', atk: 'hammer', anim: 'hammer', icon: 'hammer_b3',
    text: (up) => `Deal {${v(up, 5, 8)}} damage to all ground foes and [Flip] [Shelled] ones.`,
    play: (x, up) => void x.attackAll(v(up, 5, 8), { kind: 'hammer', flip: true, contact: false }),
  },
  {
    id: 'sleepStomp', name: 'Sleep Stomp', owner: 'mario', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b4', exhaust: true,
    text: (up) => `Deal {${v(up, 3, 6)}} damage. Apply [Sleep] {${v(up, 1, 2)}}. Exhaust. [Jump]`,
    play: (x, up) => {
      x.attack(v(up, 3, 6), { kind: 'jump' });
      x.apply('sleep', v(up, 1, 2));
    },
  },
  {
    id: 'dizzyStomp', name: 'Dizzy Stomp', owner: 'mario', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b5', exhaust: true,
    text: (up) => `Deal {${v(up, 4, 7)}} damage. Apply [Dizzy] 1. Exhaust. [Jump]`,
    play: (x, up) => {
      x.attack(v(up, 4, 7), { kind: 'jump' });
      x.apply('dizzy', 1);
    },
  },
  {
    id: 'shrinkStomp', name: 'Shrink Stomp', owner: 'mario', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b6',
    text: (up) => `Deal {${v(up, 4, 6)}} damage. Apply [Shrunk] {${v(up, 2, 3)}}. [Jump]`,
    play: (x, up) => {
      x.attack(v(up, 4, 6), { kind: 'jump' });
      x.apply('shrunk', v(up, 2, 3));
    },
  },
  {
    id: 'speedySpin', name: 'Speedy Spin', owner: 'mario', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', atk: 'ground', anim: 'dash', icon: 'b_121',
    text: (up) => `Deal {${v(up, 3, 5)}} damage. Draw 1 card.`,
    play: (x, up) => {
      x.attack(v(up, 3, 5), { kind: 'ground' });
      x.draw(1);
    },
  },
  {
    id: 'spinGuard', name: 'Spin Guard', owner: 'mario', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'buff', icon: 'b_237',
    text: (up) => `Mario gains {${v(up, 8, 11)}} [Block].`,
    play: (x, up) => x.block(v(up, 8, 11)),
  },
  {
    id: 'charge', name: 'Charge', owner: 'mario', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'buff', icon: 'b_163',
    text: (up) => `Mario gains [Charge] {${v(up, 7, 10)}}.`,
    play: (x, up) => x.apply('charge', v(up, 7, 10), x.mario),
  },
  {
    id: 'focus', name: 'Focus', owner: 'mario', type: 'skill', rarity: 'common', cost: 1, costUp: 0, target: 'none', anim: 'buff', icon: 'star',
    text: () => `Gain 2 [Star Power]. Draw 1 card.`,
    play: (x) => {
      x.gainStar(2);
      x.draw(1);
    },
  },
  {
    id: 'dDownJump', name: 'D-Down Jump', owner: 'mario', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b7',
    text: (up) => `Deal {${v(up, 7, 10)}} damage. [Pierce]. [Jump]`,
    play: (x, up) => void x.attack(v(up, 7, 10), { kind: 'jump', pierce: true }),
  },
  {
    id: 'quickChange', name: 'Quick Change', owner: 'mario', type: 'skill', rarity: 'common', cost: 0, target: 'none', anim: 'buff', icon: 'b_120', exhaust: true,
    text: (up) => `Draw {${v(up, 2, 3)}} cards. Exhaust.`,
    play: (x, up) => x.draw(v(up, 2, 3)),
  },
  // ---------------- Mario: uncommon ----------------
  {
    id: 'piercingBlow', name: 'Piercing Blow', owner: 'mario', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'hammer', anim: 'hammer', icon: 'hammer_b4',
    text: (up) => `Deal {${v(up, 12, 16)}} damage. [Pierce]. Apply [Soft] 1. [Hammer]`,
    play: (x, up) => {
      x.attack(v(up, 12, 16), { kind: 'hammer', pierce: true });
      x.apply('soft', 1);
    },
  },
  {
    id: 'powerRush', name: 'Power Rush', owner: 'mario', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'b_229',
    text: (up) => `Mario gains {${v(up, 2, 3)}} [Strength].`,
    play: (x, up) => x.apply('strength', v(up, 2, 3), x.mario),
  },
  {
    id: 'happyHeartCard', name: 'Happy Heart', owner: 'mario', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'b_232',
    text: (up) => `At the end of your turn, heal Mario {${v(up, 2, 3)}}.`,
    play: (x, up) => x.power('happyHeart', v(up, 2, 3)),
  },
  {
    id: 'spikeShieldCard', name: 'Spike Shield', owner: 'mario', type: 'power', rarity: 'uncommon', cost: 1, costUp: 0, target: 'none', anim: 'buff', icon: 'b_245',
    text: () => `Mario's [Jump] attacks deal +2 damage and never hurt him on [Spiky] foes.`,
    play: (x) => x.power('spikeShield', 2),
  },
  {
    id: 'feelingFineCard', name: 'Feeling Fine', owner: 'mario', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'b_249',
    text: (up) => `Remove all debuffs from your team. Each ally gains {${v(up, 4, 6)}} [Block].`,
    play: (x, up) => {
      for (const a of x.allies) x.c.removeDebuffs(a);
      x.blockAll(v(up, 4, 6));
    },
  },
  {
    id: 'doubleDip', name: 'Item Rush', owner: 'mario', type: 'skill', rarity: 'uncommon', cost: 1, costUp: 0, target: 'none', anim: 'buff', icon: 'b_252', exhaust: true,
    text: () => `Gain a random item. Exhaust.`,
    play: (x) => {
      const slot = x.c.items.indexOf(null);
      const pool = ['mushroom', 'fireflower', 'honey', 'pow', 'snowman', 'coconut', 'stonecap', 'dizzydial'];
      const id = x.c.rng.pick(pool);
      if (slot >= 0) x.c.items[slot] = id;
      x.c.emit({ t: 'text', target: 'mario', text: slot >= 0 ? 'Got an item!' : 'Bag full!', color: '#fff' });
    },
  },
  {
    id: 'tornadoJump', name: 'Tornado Jump', owner: 'mario', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'b_239',
    text: (up) => `Deal {${v(up, 9, 12)}} damage, then {${v(up, 4, 6)}} to every other enemy. [Jump]`,
    play: (x, up) => {
      const t = x.target;
      x.attack(v(up, 9, 12), { kind: 'jump' });
      for (const e of x.enemies) if (e !== t) x.c.attack(x.src, e, v(up, 4, 6), { kind: 'ranged', contact: false }, false);
    },
  },
  {
    id: 'megaRushCard', name: 'Mega Rush', owner: 'mario', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', atk: 'hammer', anim: 'hammer', icon: 'b_235',
    text: (up) => `Deal {${v(up, 7, 10)}} damage. If Mario is under half HP, deal {${v(up, 20, 26)}} instead. [Hammer]`,
    play: (x, up) => {
      const low = x.mario.hp < x.mario.maxHp / 2;
      x.attack(low ? v(up, 20, 26) : v(up, 7, 10), { kind: 'hammer' });
    },
  },
  // ---------------- Mario: rare ----------------
  {
    id: 'ultraHammer', name: 'Ultra Hammer', owner: 'mario', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', atk: 'hammer', anim: 'hammer', icon: 'hammer_b6',
    text: (up) => `Deal {${v(up, 30, 40)}} damage. [Hammer]`,
    play: (x, up) => void x.attack(v(up, 30, 40), { kind: 'hammer' }),
  },
  {
    id: 'superJump', name: 'Ultra Jump', owner: 'mario', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'b_252',
    text: (up) => `Deal {${v(up, 7, 9)}} damage 3 times. [Jump]`,
    play: (x, up) => void x.attack(v(up, 7, 9), { kind: 'jump', hits: 3 }),
  },
  {
    id: 'starRod', name: 'Star Beam', owner: 'mario', type: 'skill', rarity: 'rare', cost: 1, target: 'none', anim: 'cast', icon: 'starIcon', exhaust: true,
    text: (up) => `Gain {${v(up, 4, 6)}} [Star Power]. Exhaust.`,
    play: (x, up) => x.gainStar(v(up, 4, 6)),
  },
  {
    id: 'lastStandCard', name: 'Last Stand', owner: 'mario', type: 'power', rarity: 'rare', cost: 2, costUp: 1, target: 'none', anim: 'buff', icon: 'b_247',
    text: () => `Mario gains 1 [Strength] at the end of each turn.`,
    play: (x) => x.apply('growth', 1, x.mario),
  },

  // ---------------- Goombario ----------------
  {
    id: 'headbonk', name: 'Headbonk', owner: 'goombario', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'p_goombario',
    text: (up) => `Goombario deals {${v(up, 4, 5)}} damage twice. [Jump]`,
    play: (x, up) => void x.attack(v(up, 4, 5), { kind: 'jump', hits: 2 }),
  },
  {
    id: 'tattle', name: 'Tattle', owner: 'goombario', type: 'skill', rarity: 'starter', cost: 0, target: 'enemy', anim: 'cast', icon: 'i_book',
    text: (up) => `Apply [Soft] {${v(up, 1, 2)}}. Draw 1 card.`,
    play: (x, up) => {
      x.apply('soft', v(up, 1, 2));
      x.draw(1);
    },
  },
  {
    id: 'goomCharge', name: 'Charge', owner: 'goombario', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'buff', icon: 'st_charge',
    text: (up) => `Goombario gains [Charge] {${v(up, 9, 13)}}.`,
    play: (x, up) => x.apply('charge', v(up, 9, 13), x.src),
  },
  {
    id: 'multibonk', name: 'Multibonk', owner: 'goombario', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b1',
    text: (up) => `Goombario deals {${v(up, 3, 4)}} damage 4 times. [Jump]`,
    play: (x, up) => void x.attack(v(up, 3, 4), { kind: 'jump', hits: 4 }),
  },
  {
    id: 'rallyWink', name: 'Rally Wink', owner: 'goombario', type: 'skill', rarity: 'uncommon', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'b_114',
    text: () => `Next turn, gain 2 FP.`,
    play: (x) => {
      x.c.bonusFpNext += 2;
      x.c.emit({ t: 'text', target: x.src.uid, text: 'Wink!', color: '#ffd84a' });
    },
  },
  {
    id: 'powerBounce', name: 'Power Bounce', owner: 'goombario', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'b_115',
    text: (up) => `Goombario deals {${v(up, 4, 5)}} damage twice. On a Nice!, twice more. [Jump]`,
    play: (x, up) => void x.attack(v(up, 4, 5), { kind: 'jump', hits: x.nice ? 4 : 2 }),
  },
  {
    id: 'tattleLog', name: 'Tattle Log', owner: 'goombario', type: 'power', rarity: 'rare', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'i_letter',
    text: () => `At the start of each turn, apply [Soft] 1 to a random enemy.`,
    play: (x) => x.power('tattleLog', 1),
  },

  {
    id: 'quickBonk', name: 'Quick Bonk', owner: 'goombario', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b1',
    text: (up) => `Goombario deals {${v(up, 3, 5)}} damage. Draw 1 card. [Jump]`,
    play: (x, up) => {
      x.attack(v(up, 3, 5), { kind: 'jump' });
      x.draw(1);
    },
  },
  {
    id: 'sizeUp', name: 'Size Up', owner: 'goombario', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'cast', icon: 'i_book',
    text: (up) => `Apply [Soft] {${v(up, 1, 2)}} to ALL enemies. Draw 1 card.`,
    play: (x, up) => {
      x.applyAllEnemies('soft', v(up, 1, 2));
      x.draw(1);
    },
  },
  {
    id: 'dizzyBonk', name: 'Dizzy Bonk', owner: 'goombario', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'boots_b5',
    text: (up) => `Goombario deals {${v(up, 5, 7)}} damage twice. If the target was [Soft], apply [Dizzy] 1. [Jump]`,
    play: (x, up) => {
      const soft = !!x.target?.st.soft;
      x.attack(v(up, 5, 7), { kind: 'jump', hits: 2 });
      if (soft) x.apply('dizzy', 1);
    },
  },
  {
    id: 'brightIdea', name: 'Bright Idea', owner: 'goombario', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'cast', icon: 'b_114',
    text: (up) => `Draw {${v(up, 2, 3)}} cards. Next turn, gain 1 FP.`,
    play: (x, up) => {
      x.draw(v(up, 2, 3));
      x.c.bonusFpNext += 1;
    },
  },
  {
    id: 'encyclopedia', name: 'Encyclopedia', owner: 'goombario', type: 'power', rarity: 'rare', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'i_book',
    text: () => `Whenever an enemy becomes [Soft], draw 1 card (up to 2 per turn).`,
    play: (x) => x.power('encyclopedia', 1),
  },

  // ---------------- Kooper ----------------
  {
    id: 'shellToss', name: 'Shell Toss', owner: 'kooper', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ground', anim: 'shell', icon: 'p_kooper',
    text: (up) => `Kooper deals {${v(up, 7, 10)}} damage. Can't reach [Flying] foes.`,
    play: (x, up) => void x.attack(v(up, 7, 10), { kind: 'ground' }),
  },
  {
    id: 'shellShield', name: 'Shell Shield', owner: 'kooper', type: 'skill', rarity: 'starter', cost: 1, target: 'none', anim: 'buff', icon: 'shell',
    text: (up) => `Mario gains {${v(up, 7, 10)}} [Block].`,
    play: (x, up) => x.block(v(up, 7, 10)),
  },
  {
    id: 'powerShell', name: 'Power Shell', owner: 'kooper', type: 'attack', rarity: 'common', cost: 2, target: 'allEnemies', atk: 'ground', anim: 'shell', icon: 'hammer_b5',
    text: (up) => `Kooper deals {${v(up, 6, 9)}} damage to every ground foe.`,
    play: (x, up) => void x.attackAll(v(up, 6, 9), { kind: 'ground' }),
  },
  {
    id: 'dizzyShell', name: 'Dizzy Shell', owner: 'kooper', type: 'skill', rarity: 'common', cost: 1, costUp: 0, target: 'none', anim: 'shell', icon: 'st_dizzy', exhaust: true,
    text: () => `Apply [Dizzy] 1 to every ground foe. Exhaust.`,
    play: (x) => {
      for (const e of x.enemies) if (x.c.canReach('ground', e)) x.apply('dizzy', 1, e);
    },
  },
  {
    id: 'fireShell', name: 'Fire Shell', owner: 'kooper', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ground', anim: 'shell', icon: 'fireflower',
    text: (up) => `Kooper deals {${v(up, 10, 13)}} damage and applies [Burn] {${v(up, 3, 4)}}.`,
    play: (x, up) => {
      x.attack(v(up, 10, 13), { kind: 'ground', fire: true });
      x.apply('burn', v(up, 3, 4));
    },
  },
  {
    id: 'shellWall', name: 'Shell Wall', owner: 'kooper', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none', anim: 'buff', icon: 'b_243',
    text: (up) => `Every ally gains {${v(up, 8, 11)}} [Block].`,
    play: (x, up) => x.blockAll(v(up, 8, 11)),
  },
  {
    id: 'shellFortress', name: 'Shell Fortress', owner: 'kooper', type: 'power', rarity: 'rare', cost: 2, target: 'none', anim: 'buff', icon: 'b_240',
    text: (up) => `At the end of each turn, Mario gains {${v(up, 5, 7)}} [Block].`,
    play: (x, up) => x.power('shellFortress', v(up, 5, 7)),
  },

  {
    id: 'shellBash', name: 'Shell Bash', owner: 'kooper', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ground', anim: 'shell', icon: 'shell',
    text: (up) => `Kooper deals {${v(up, 5, 7)}} damage. Mario gains {${v(up, 4, 6)}} [Block].`,
    play: (x, up) => {
      x.attack(v(up, 5, 7), { kind: 'ground' });
      x.block(v(up, 4, 6));
    },
  },
  {
    id: 'withdraw', name: 'Withdraw', owner: 'kooper', type: 'skill', rarity: 'common', cost: 0, target: 'none', anim: 'buff', icon: 'b_238',
    text: (up) => `Kooper gains {${v(up, 5, 8)}} [Block]. Draw 1 card.`,
    play: (x, up) => {
      x.block(v(up, 5, 8), x.src);
      x.draw(1);
    },
  },
  {
    id: 'spinShell', name: 'Spin Shell', owner: 'kooper', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ground', anim: 'shell', icon: 'hammer_b5',
    text: (up) => `Kooper deals {${v(up, 4, 6)}} damage to every ground foe twice.`,
    play: (x, up) => void x.attackAll(v(up, 4, 6), { kind: 'ground', hits: 2 }),
  },
  {
    id: 'spikedShell', name: 'Spiked Shell', owner: 'kooper', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'b_245',
    text: (up) => `Mario gains {${v(up, 6, 9)}} [Block] and {${v(up, 2, 3)}} [Static].`,
    play: (x, up) => {
      x.block(v(up, 6, 9));
      x.apply('static', v(up, 2, 3), x.mario);
    },
  },
  {
    id: 'shellSlam', name: 'Shell Slam', owner: 'kooper', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', atk: 'ground', anim: 'shell', icon: 'b_240',
    text: (up) => `Kooper deals damage equal to Mario's [Block]${up ? ' +5' : ''}. Can't reach [Flying] foes.`,
    play: (x, up) => void x.attack(x.mario.block + (up ? 5 : 0), { kind: 'ground' }),
  },

  // ---------------- Bombette ----------------
  {
    id: 'bodySlam', name: 'Body Slam', owner: 'bombette', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ground', anim: 'dash', icon: 'p_bombette',
    text: (up) => `Bombette deals {${v(up, 8, 11)}} damage. Can't reach [Flying] foes.`,
    play: (x, up) => void x.attack(v(up, 8, 11), { kind: 'ground' }),
  },
  {
    id: 'bomb', name: 'Bomb', owner: 'bombette', type: 'attack', rarity: 'starter', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'b_245',
    text: (up) => `Deal {${v(up, 6, 9)}} damage to ALL enemies. [Pierce]. [Flip]s [Shelled] foes.`,
    play: (x, up) => void x.attackAll(v(up, 6, 9), { kind: 'ranged', pierce: true, flip: true, contact: false, fire: true }),
  },
  {
    id: 'powerBomb', name: 'Power Bomb', owner: 'bombette', type: 'attack', rarity: 'common', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'b_247', exhaust: true,
    text: (up) => `Deal {${v(up, 11, 15)}} damage to ALL enemies. [Pierce]. Exhaust.`,
    play: (x, up) => void x.attackAll(v(up, 11, 15), { kind: 'ranged', pierce: true, contact: false, fire: true }),
  },
  {
    id: 'fuse', name: 'Light the Fuse', owner: 'bombette', type: 'skill', rarity: 'common', cost: 0, target: 'none', anim: 'buff', icon: 'st_charge',
    text: (up) => `Bombette gains [Charge] {${v(up, 5, 8)}}.`,
    play: (x, up) => x.apply('charge', v(up, 5, 8), x.src),
  },
  {
    id: 'megaBomb', name: 'Mega Bomb', owner: 'bombette', type: 'attack', rarity: 'uncommon', cost: 3, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'burst100',
    text: (up) => `Deal {${v(up, 18, 24)}} damage to ALL enemies. [Pierce]. Bombette takes 4 damage.`,
    play: (x, up) => {
      x.attackAll(v(up, 18, 24), { kind: 'ranged', pierce: true, flip: true, contact: false, fire: true });
      x.hurtSelf(4);
    },
  },
  {
    id: 'chainReaction', name: 'Chain Reaction', owner: 'bombette', type: 'attack', rarity: 'uncommon', cost: 1, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'b_253',
    text: (up) => `Deal {4} damage to a random enemy {${v(up, 3, 4)}} times. [Pierce].`,
    play: (x, up) => void x.attackRandom(4, v(up, 3, 4), { kind: 'ranged', pierce: true, contact: false }),
  },
  {
    id: 'kaboom', name: 'Kaboom', owner: 'bombette', type: 'power', rarity: 'rare', cost: 1, target: 'none', anim: 'buff', icon: 'b_244',
    text: (up) => `Whenever an enemy is defeated, deal {${v(up, 4, 6)}} damage to ALL enemies.`,
    play: (x, up) => x.power('kaboom', v(up, 4, 6)),
  },

  {
    id: 'shortFuse', name: 'Short Fuse', owner: 'bombette', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', atk: 'ranged', anim: 'bomb', icon: 'st_charge',
    text: (up) => `Deal {${v(up, 5, 7)}} damage. [Pierce]. Bombette takes 2 damage.`,
    play: (x, up) => {
      x.attack(v(up, 5, 7), { kind: 'ranged', pierce: true, contact: false, fire: true });
      x.hurtSelf(2);
    },
  },
  {
    id: 'cherryBomb', name: 'Cherry Bomb', owner: 'bombette', type: 'attack', rarity: 'common', cost: 1, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'b_253',
    text: (up) => `Deal {${v(up, 4, 6)}} damage to ALL enemies. [Pierce].`,
    play: (x, up) => void x.attackAll(v(up, 4, 6), { kind: 'ranged', pierce: true, contact: false, fire: true }),
  },
  {
    id: 'blastOff', name: 'Blast Off', owner: 'bombette', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ranged', anim: 'bomb', icon: 'burst100',
    text: (up) => `Deal {${v(up, 13, 17)}} damage. [Pierce]. If this defeats the target, gain {${v(up, 1, 2)}} FP.`,
    play: (x, up) => {
      x.attack(v(up, 13, 17), { kind: 'ranged', pierce: true, contact: false, fire: true });
      if (x.target?.dead) x.gainFp(v(up, 1, 2));
    },
  },
  {
    id: 'explosiveTemper', name: 'Hot Temper', owner: 'bombette', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'arrowUp',
    text: (up) => `Bombette gains {${v(up, 2, 3)}} [Strength].`,
    play: (x, up) => x.apply('strength', v(up, 2, 3), x.src),
  },
  {
    id: 'ultraBomb', name: 'Ultra Bomb', owner: 'bombette', type: 'attack', rarity: 'rare', cost: 3, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'b_247', exhaust: true,
    text: (up) => `Deal {${v(up, 22, 30)}} damage to ALL enemies. [Pierce]. Bombette takes 8 damage. Exhaust.`,
    play: (x, up) => {
      x.attackAll(v(up, 22, 30), { kind: 'ranged', pierce: true, flip: true, contact: false, fire: true });
      x.hurtSelf(8);
    },
  },

  // ---------------- Parakarry ----------------
  {
    id: 'skyDive', name: 'Sky Dive', owner: 'parakarry', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ranged', anim: 'dash', icon: 'p_parakarry',
    text: (up) => `Parakarry deals {${v(up, 6, 9)}} damage, +5 to [Flying] foes.`,
    play: (x, up) => void x.attack(v(up, 6, 9) + (x.target?.traits.includes('flying') ? 5 : 0), { kind: 'ranged' }),
  },
  {
    id: 'airMail', name: 'Air Mail', owner: 'parakarry', type: 'skill', rarity: 'starter', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'i_letter',
    text: () => `Draw 2 cards.`,
    play: (x) => x.draw(2),
  },
  {
    id: 'shellShot', name: 'Shell Shot', owner: 'parakarry', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'shell',
    text: (up) => `Deal {${v(up, 8, 11)}} damage. [Pierce].`,
    play: (x, up) => void x.attack(v(up, 8, 11), { kind: 'ranged', pierce: true, contact: false }),
  },
  {
    id: 'specialDelivery', name: 'Special Delivery', owner: 'parakarry', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'cast', icon: 'i_gift',
    text: (up) => `Add a random${up ? ' upgraded' : ''} Mario card to your hand. It costs 0 this turn.`,
    play: (x, up) => {
      const pool = ['powerJump', 'powerSmash', 'multibounce', 'hammerThrow', 'spinGuard', 'charge', 'quakeHammer', 'dDownJump'];
      x.c.addCardToHand(x.c.rng.pick(pool), up, true);
    },
  },
  {
    id: 'airLift', name: 'Air Lift', owner: 'parakarry', type: 'skill', rarity: 'uncommon', cost: 2, target: 'enemy', anim: 'dash', icon: 'b_121', exhaust: true,
    text: (up) => `Carry off a non-boss enemy with {${v(up, 12, 18)}} or less HP. Exhaust.`,
    play: (x, up) => {
      const t = x.target!;
      if (t.traits.includes('boss') || t.hp > v(up, 12, 18)) {
        x.c.emit({ t: 'text', target: t.uid, text: 'Too heavy!' });
        return;
      }
      x.c.flee(t);
      x.c.checkEnd();
    },
  },
  {
    id: 'airRaid', name: 'Air Raid', owner: 'parakarry', type: 'attack', rarity: 'uncommon', cost: 3, target: 'allEnemies', atk: 'ranged', anim: 'dash', icon: 'b_234',
    text: (up) => `Deal {${v(up, 5, 7)}} damage to ALL enemies twice.`,
    play: (x, up) => void x.attackAll(v(up, 5, 7), { kind: 'ranged', hits: 2 }),
  },
  {
    id: 'expressMail', name: 'Express Mail', owner: 'parakarry', type: 'power', rarity: 'rare', cost: 1, target: 'none', anim: 'cast', icon: 'b_226',
    text: (up) => `Draw ${up ? 2 : 1} extra card${up ? 's' : ''} each turn.`,
    play: (x, up) => x.power('expressMail', v(up, 1, 2)),
  },

  {
    id: 'packageDrop', name: 'Package Drop', owner: 'parakarry', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'i_gift',
    text: (up) => `Deal {${v(up, 6, 9)}} damage. Draw 1 card.`,
    play: (x, up) => {
      x.attack(v(up, 6, 9), { kind: 'ranged', contact: false });
      x.draw(1);
    },
  },
  {
    id: 'returnToSender', name: 'Return Mail', owner: 'parakarry', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'cast', icon: 'i_letter',
    text: (up) => `Mario gains {${v(up, 5, 8)}} [Block]. Return a random card from your discard pile to your hand.`,
    play: (x, up) => {
      x.block(v(up, 5, 8));
      x.c.recoverDiscard();
    },
  },
  {
    id: 'diveBomb', name: 'Dive Bomb', owner: 'parakarry', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ranged', anim: 'dash', icon: 'b_121',
    text: (up) => `Parakarry deals {${v(up, 10, 14)}} damage, +10 to [Flying] foes.`,
    play: (x, up) => void x.attack(v(up, 10, 14) + (x.target?.traits.includes('flying') ? 10 : 0), { kind: 'ranged' }),
  },
  {
    id: 'letterBarrage', name: 'Letter Barrage', owner: 'parakarry', type: 'attack', rarity: 'uncommon', cost: 1, target: 'allEnemies', atk: 'ranged', anim: 'throw', icon: 'i_letter',
    text: (up) => `Deal {${v(up, 2, 3)}} damage to a random enemy once for each card in your hand.`,
    play: (x, up) => void x.attackRandom(v(up, 2, 3), x.c.hand.length, { kind: 'ranged', contact: false }),
  },
  {
    id: 'priorityMail', name: 'Priority Mail', owner: 'parakarry', type: 'skill', rarity: 'rare', cost: 2, costUp: 1, target: 'none', anim: 'cast', icon: 'b_226', exhaust: true,
    text: () => `Draw 3 cards. They cost 0 this turn. Exhaust.`,
    play: (x) => {
      const before = x.c.hand.length;
      x.draw(3);
      for (const inst of x.c.hand.slice(before)) inst.free = true;
    },
  },

  // ---------------- Bow ----------------
  {
    id: 'smack', name: 'Smack', owner: 'bow', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ranged', anim: 'smack', icon: 'p_bow',
    text: (up) => `Bow deals {${v(up, 2, 3)}} damage 4 times.`,
    play: (x, up) => void x.attack(v(up, 2, 3), { kind: 'ranged', hits: 4 }),
  },
  {
    id: 'outtaSight', name: 'Outta Sight', owner: 'bow', type: 'skill', rarity: 'starter', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'b_162', exhaust: true,
    text: () => `Mario becomes [Hidden] until your next turn. Exhaust.`,
    play: (x) => x.apply('hidden', 1, x.mario),
  },
  {
    id: 'fanSmack', name: 'Fan Smack', owner: 'bow', type: 'attack', rarity: 'common', cost: 2, target: 'enemy', atk: 'ranged', anim: 'smack', icon: 'b_241',
    text: (up) => `Bow deals {${v(up, 3, 4)}} damage 5 times.`,
    play: (x, up) => void x.attack(v(up, 3, 4), { kind: 'ranged', hits: 5 }),
  },
  {
    id: 'spook', name: 'Spook', owner: 'bow', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'cast', icon: 'st_shrink',
    text: (up) => `Apply [Shrunk] {${v(up, 2, 3)}} to ALL enemies.`,
    play: (x, up) => x.applyAllEnemies('shrunk', v(up, 2, 3)),
  },
  {
    id: 'slapHappy', name: 'Slap Happy', owner: 'bow', type: 'attack', rarity: 'uncommon', cost: 0, target: 'allEnemies', atk: 'ranged', anim: 'smack', icon: 'b_114',
    text: (up) => `Deal {${v(up, 1, 2)}} damage to a random enemy 3 times. Draw 1 card.`,
    play: (x, up) => {
      x.attackRandom(v(up, 1, 2), 3, { kind: 'ranged' });
      x.draw(1);
    },
  },
  {
    id: 'ghostlyVeil', name: 'Ghostly Veil', owner: 'bow', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none', anim: 'cast', icon: 'b_244',
    text: (up) => `Every ally gains {${v(up, 6, 9)}} [Block]. Bow becomes [Hidden].`,
    play: (x, up) => {
      x.blockAll(v(up, 6, 9));
      x.apply('hidden', 1, x.src);
    },
  },
  {
    id: 'poltergeist', name: 'Poltergeist', owner: 'bow', type: 'power', rarity: 'rare', cost: 2, target: 'none', anim: 'cast', icon: 'b_299',
    text: (up) => `At the start of each turn, deal {${v(up, 3, 5)}} damage to ALL enemies.`,
    play: (x, up) => x.power('poltergeist', v(up, 3, 5)),
  },

  {
    id: 'slapAround', name: 'Slap Around', owner: 'bow', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'smack', icon: 'b_241',
    text: (up) => `Bow deals {${v(up, 1, 2)}} damage 6 times.`,
    play: (x, up) => void x.attack(v(up, 1, 2), { kind: 'ranged', hits: 6 }),
  },
  {
    id: 'booScare', name: 'Boo!', owner: 'bow', type: 'skill', rarity: 'common', cost: 1, target: 'enemy', anim: 'cast', icon: 'st_shrink',
    text: (up) => `Apply [Shrunk] {${v(up, 2, 3)}}. Draw 1 card.`,
    play: (x, up) => {
      x.apply('shrunk', v(up, 2, 3));
      x.draw(1);
    },
  },
  {
    id: 'haunt', name: 'Haunt', owner: 'bow', type: 'power', rarity: 'uncommon', cost: 1, costUp: 0, target: 'none', anim: 'cast', icon: 'b_162',
    text: () => `At the start of each turn, apply [Shrunk] 1 to a random enemy.`,
    play: (x) => x.power('haunt', 1),
  },
  {
    id: 'fanFrenzy', name: 'Fan Frenzy', owner: 'bow', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ranged', anim: 'smack', icon: 'b_114',
    text: (up) => `Bow deals {${v(up, 2, 3)}} damage 4 times, or 8 times if Mario is [Hidden].`,
    play: (x, up) => void x.attack(v(up, 2, 3), { kind: 'ranged', hits: x.mario.st.hidden ? 8 : 4 }),
  },
  {
    id: 'spectralFury', name: 'Spectral Fury', owner: 'bow', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', atk: 'ranged', anim: 'smack', icon: 'b_299',
    text: (up) => `Bow deals {${v(up, 2, 3)}} damage 2 times, plus 1 time for each other card played this turn.`,
    play: (x, up) => void x.attack(v(up, 2, 3), { kind: 'ranged', hits: 2 + x.c.playedThisTurn }),
  },

  // ---------------- Watt ----------------
  {
    id: 'electroDash', name: 'Electro Dash', owner: 'watt', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ranged', anim: 'zap', icon: 'p_watt',
    text: (up) => `Watt deals {${v(up, 6, 9)}} damage. [Pierce].`,
    play: (x, up) => void x.attack(v(up, 6, 9), { kind: 'ranged', pierce: true }),
  },
  {
    id: 'powerShock', name: 'Power Shock', owner: 'watt', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ranged', anim: 'zap', icon: 'st_static', exhaust: true,
    text: (up) => `Deal {${v(up, 3, 6)}} damage. Apply [Dizzy] 1. Exhaust.`,
    play: (x, up) => {
      x.attack(v(up, 3, 6), { kind: 'ranged', pierce: true });
      x.apply('dizzy', 1);
    },
  },
  {
    id: 'turboCharge', name: 'Turbo Charge', owner: 'watt', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'zap', icon: 'arrowUp',
    text: (up) => `Every ally gains {${v(up, 3, 5)}} [Pumped] this turn.`,
    play: (x, up) => {
      for (const a of x.allies) x.apply('pumped', v(up, 3, 5), a);
    },
  },
  {
    id: 'wattStatic', name: 'Static Field', owner: 'watt', type: 'power', rarity: 'common', cost: 1, target: 'none', anim: 'zap', icon: 'b_119',
    text: (up) => `Mario gains {${v(up, 3, 5)}} [Static].`,
    play: (x, up) => x.apply('static', v(up, 3, 5), x.mario),
  },
  {
    id: 'megaShock', name: 'Mega Shock', owner: 'watt', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'zap', icon: 'i_thunderrage',
    text: (up) => `Deal {${v(up, 6, 9)}} damage to ALL enemies. [Pierce]. Apply [Dizzy] 1 to a random one.`,
    play: (x, up) => {
      x.attackAll(v(up, 6, 9), { kind: 'ranged', pierce: true, contact: false });
      const live = x.enemies;
      if (live.length) x.apply('dizzy', 1, x.c.rng.pick(live));
    },
  },
  {
    id: 'overcharge', name: 'Overcharge', owner: 'watt', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', anim: 'zap', icon: 'i_voltshroom',
    text: (up) => `Gain {${v(up, 2, 3)}} FP. Watt takes 4 damage.`,
    play: (x, up) => {
      x.gainFp(v(up, 2, 3));
      x.hurtSelf(4);
    },
  },
  {
    id: 'battery', name: 'Battery', owner: 'watt', type: 'power', rarity: 'rare', cost: 2, costUp: 1, target: 'none', anim: 'zap', icon: 'b_113',
    text: () => `Gain 1 extra FP every turn.`,
    play: (x) => x.power('battery', 1),
  },

  {
    id: 'zapJolt', name: 'Jolt', owner: 'watt', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', atk: 'ranged', anim: 'zap', icon: 'st_static',
    text: (up) => `Watt deals {${v(up, 3, 5)}} damage. [Pierce].`,
    play: (x, up) => void x.attack(v(up, 3, 5), { kind: 'ranged', pierce: true }),
  },
  {
    id: 'surge', name: 'Surge', owner: 'watt', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'zap', icon: 'b_119',
    text: (up) => `Mario gains {${v(up, 5, 7)}} [Block] and {${v(up, 2, 3)}} [Static].`,
    play: (x, up) => {
      x.block(v(up, 5, 7));
      x.apply('static', v(up, 2, 3), x.mario);
    },
  },
  {
    id: 'chainLightning', name: 'Chain Lightning', owner: 'watt', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ranged', anim: 'zap', icon: 'i_thunderbolt',
    text: (up) => `Deal {${v(up, 8, 11)}} damage, then {${v(up, 3, 5)}} to every other enemy. [Pierce].`,
    play: (x, up) => {
      const t = x.target;
      x.attack(v(up, 8, 11), { kind: 'ranged', pierce: true });
      for (const e of x.enemies) if (e !== t) x.c.attack(x.src, e, v(up, 3, 5), { kind: 'ranged', pierce: true, contact: false }, false);
    },
  },
  {
    id: 'overclock', name: 'Overclock', owner: 'watt', type: 'power', rarity: 'uncommon', cost: 2, costUp: 1, target: 'none', anim: 'zap', icon: 'arrowUp',
    text: () => `At the start of each turn, every ally gains 1 [Pumped].`,
    play: (x) => x.power('overclock', 1),
  },
  {
    id: 'lightningStorm', name: 'Lightning Storm', owner: 'watt', type: 'attack', rarity: 'rare', cost: 3, costUp: 2, target: 'allEnemies', atk: 'ranged', anim: 'zap', icon: 'i_thunderrage', exhaust: true,
    text: () => `Deal {12} damage to ALL enemies. [Pierce]. Apply [Dizzy] 1 to ALL enemies. Exhaust.`,
    play: (x) => {
      x.attackAll(12, { kind: 'ranged', pierce: true, contact: false });
      x.applyAllEnemies('dizzy', 1);
    },
  },

  // ---------------- Sushie ----------------
  {
    id: 'bellyFlop', name: 'Belly Flop', owner: 'sushie', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'p_sushie',
    text: (up) => `Sushie deals {${v(up, 8, 11)}} damage. [Jump]`,
    play: (x, up) => void x.attack(v(up, 8, 11), { kind: 'jump' }),
  },
  {
    id: 'waterBlock', name: 'Water Block', owner: 'sushie', type: 'skill', rarity: 'starter', cost: 1, target: 'none', anim: 'cast', icon: 'block',
    text: (up) => `Every ally gains {${v(up, 4, 6)}} [Block].`,
    play: (x, up) => x.blockAll(v(up, 4, 6)),
  },
  {
    id: 'squirt', name: 'Squirt', owner: 'sushie', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'i_tonic',
    text: (up) => `Deal {${v(up, 6, 8)}} damage. Apply [Soft] {${v(up, 1, 2)}}.`,
    play: (x, up) => {
      x.attack(v(up, 6, 8), { kind: 'ranged', contact: false });
      x.apply('soft', v(up, 1, 2));
    },
  },
  {
    id: 'douse', name: 'Douse', owner: 'sushie', type: 'skill', rarity: 'common', cost: 0, target: 'ally', anim: 'cast', icon: 'i_jelly',
    text: (up) => `Remove an ally's debuffs and heal it {${v(up, 3, 6)}}.`,
    play: (x, up) => {
      if (!x.target) return;
      x.c.removeDebuffs(x.target);
      x.heal(v(up, 3, 6), x.target);
    },
  },
  {
    id: 'tidalWave', name: 'Tidal Wave', owner: 'sushie', type: 'attack', rarity: 'uncommon', cost: 3, target: 'allEnemies', atk: 'ranged', anim: 'cast', icon: 'b_240',
    text: (up) => `Deal {${v(up, 4, 5)}} damage to ALL enemies 3 times.`,
    play: (x, up) => void x.attackAll(v(up, 4, 5), { kind: 'ranged', hits: 3, contact: false }),
  },
  {
    id: 'bubbleHeal', name: 'Bubble Heal', owner: 'sushie', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'cast', icon: 'b_118', exhaust: true,
    text: (up) => `Heal every ally {${v(up, 5, 8)}}. Exhaust.`,
    play: (x, up) => x.healAll(v(up, 5, 8)),
  },
  {
    id: 'rainDance', name: 'Rain Dance', owner: 'sushie', type: 'power', rarity: 'rare', cost: 1, target: 'none', anim: 'cast', icon: 'cloud',
    text: (up) => `At the start of each turn, every ally gains {${v(up, 3, 4)}} [Block].`,
    play: (x, up) => x.power('rainDance', v(up, 3, 4)),
  },

  {
    id: 'splash', name: 'Splash', owner: 'sushie', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'jump', anim: 'jump', icon: 'i_tonic',
    text: (up) => `Sushie deals {${v(up, 6, 9)}} damage. Every ally gains {${v(up, 2, 3)}} [Block]. [Jump]`,
    play: (x, up) => {
      x.attack(v(up, 6, 9), { kind: 'jump' });
      x.blockAll(v(up, 2, 3));
    },
  },
  {
    id: 'bubbleShield', name: 'Bubble Shield', owner: 'sushie', type: 'skill', rarity: 'common', cost: 1, target: 'ally', anim: 'cast', icon: 'block',
    text: (up) => `An ally gains {${v(up, 9, 13)}} [Block].`,
    play: (x, up) => x.target && x.block(v(up, 9, 13), x.target),
  },
  {
    id: 'whirlpool', name: 'Whirlpool', owner: 'sushie', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'cast', icon: 'b_240',
    text: (up) => `Deal {${v(up, 5, 7)}} damage to ALL enemies. Apply [Soft] 1 to ALL enemies.`,
    play: (x, up) => {
      x.attackAll(v(up, 5, 7), { kind: 'ranged', contact: false });
      x.applyAllEnemies('soft', 1);
    },
  },
  {
    id: 'regenerate', name: 'Soothing Song', owner: 'sushie', type: 'skill', rarity: 'uncommon', cost: 1, target: 'ally', anim: 'cast', icon: 'heart',
    text: (up) => `An ally gains Regen {${v(up, 4, 6)}} (heals at end of turn, 1 less each time).`,
    play: (x, up) => x.target && x.apply('regen', v(up, 4, 6), x.target),
  },
  {
    id: 'tsunami', name: 'Tsunami', owner: 'sushie', type: 'attack', rarity: 'rare', cost: 3, costUp: 2, target: 'allEnemies', atk: 'ranged', anim: 'cast', icon: 'cloud',
    text: () => `Deal damage equal to your team's total [Block] to ALL enemies.`,
    play: (x) => void x.attackAll(x.allies.reduce((sum, a) => sum + a.block, 0), { kind: 'ranged', contact: false }),
  },

  // ---------------- Lakilester ----------------
  {
    id: 'spinyFlip', name: 'Spiny Flip', owner: 'lakilester', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'p_lakilester',
    text: (up) => `Lakilester deals {${v(up, 7, 10)}} damage.`,
    play: (x, up) => void x.attack(v(up, 7, 10), { kind: 'ranged', contact: false }),
  },
  {
    id: 'cloudNine', name: 'Cloud Nine', owner: 'lakilester', type: 'skill', rarity: 'starter', cost: 1, target: 'none', anim: 'buff', icon: 'cloud',
    text: (up) => `Mario gains {${v(up, 6, 8)}} [Block]. Draw 1 card.`,
    play: (x, up) => {
      x.block(v(up, 6, 8));
      x.draw(1);
    },
  },
  {
    id: 'spinySurge', name: 'Spiny Surge', owner: 'lakilester', type: 'attack', rarity: 'common', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'throw', icon: 'b_253',
    text: (up) => `Deal {${v(up, 6, 9)}} damage to ALL enemies.`,
    play: (x, up) => void x.attackAll(v(up, 6, 9), { kind: 'ranged', contact: false }),
  },
  {
    id: 'hurricane', name: 'Hurricane', owner: 'lakilester', type: 'skill', rarity: 'common', cost: 2, costUp: 1, target: 'none', anim: 'cast', icon: 'b_243', exhaust: true,
    text: () => `Remove all [Block] and [Strength] from ALL enemies. Exhaust.`,
    play: (x) => {
      for (const e of x.enemies) {
        e.block = 0;
        if ((e.st.strength ?? 0) > 0) delete e.st.strength;
        delete e.st.growth;
        x.c.emit({ t: 'text', target: e.uid, text: 'Blown away!' });
      }
    },
  },
  {
    id: 'spinyRain', name: 'Spiny Rain', owner: 'lakilester', type: 'attack', rarity: 'uncommon', cost: 1, target: 'allEnemies', atk: 'ranged', anim: 'throw', icon: 'b_253',
    text: (up) => `Deal {${v(up, 3, 4)}} damage to a random enemy 4 times.`,
    play: (x, up) => void x.attackRandom(v(up, 3, 4), 4, { kind: 'ranged', contact: false }),
  },
  {
    id: 'thunderhead', name: 'Thunderhead', owner: 'lakilester', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none', anim: 'cast', icon: 'i_thunderbolt',
    text: (up) => `Apply [Shrunk] {${v(up, 1, 2)}} and [Soft] {${v(up, 1, 2)}} to ALL enemies.`,
    play: (x, up) => {
      x.applyAllEnemies('shrunk', v(up, 1, 2));
      x.applyAllEnemies('soft', v(up, 1, 2));
    },
  },
  {
    id: 'cloudCover', name: 'Cloud Cover', owner: 'lakilester', type: 'power', rarity: 'rare', cost: 2, costUp: 1, target: 'none', anim: 'buff', icon: 'b_225',
    text: () => `Partners take half damage.`,
    play: (x) => x.power('cloudCover', 1),
  },

  {
    id: 'spinyToss', name: 'Spiny Toss', owner: 'lakilester', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'b_253',
    text: (up) => `Lakilester deals {${v(up, 4, 6)}} damage twice.`,
    play: (x, up) => void x.attack(v(up, 4, 6), { kind: 'ranged', hits: 2, contact: false }),
  },
  {
    id: 'cloudBurst', name: 'Cloud Burst', owner: 'lakilester', type: 'skill', rarity: 'common', cost: 1, target: 'none', anim: 'cast', icon: 'cloud',
    text: (up) => `Apply [Shrunk] {${v(up, 1, 2)}} to ALL enemies. Mario gains {${v(up, 4, 6)}} [Block].`,
    play: (x, up) => {
      x.applyAllEnemies('shrunk', v(up, 1, 2));
      x.block(v(up, 4, 6));
    },
  },
  {
    id: 'lightningCloud', name: 'Lightning Cloud', owner: 'lakilester', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', atk: 'ranged', anim: 'throw', icon: 'i_thunderbolt',
    text: (up) => `Lakilester deals {${v(up, 9, 12)}} damage. If the target was [Shrunk], apply [Dizzy] 1.`,
    play: (x, up) => {
      const shrunk = !!x.target?.st.shrunk;
      x.attack(v(up, 9, 12), { kind: 'ranged', contact: false });
      if (shrunk) x.apply('dizzy', 1);
    },
  },
  {
    id: 'spinyTrap', name: 'Spiny Trap', owner: 'lakilester', type: 'power', rarity: 'uncommon', cost: 1, target: 'none', anim: 'buff', icon: 'b_245',
    text: (up) => `Whenever an enemy hits an ally with a contact attack, it takes {${v(up, 2, 3)}} damage.`,
    play: (x, up) => x.power('spinyTrap', v(up, 2, 3)),
  },
  {
    id: 'stormFront', name: 'Storm Front', owner: 'lakilester', type: 'skill', rarity: 'rare', cost: 2, costUp: 1, target: 'none', anim: 'cast', icon: 'b_243', exhaust: true,
    text: () => `Apply [Dizzy] 1 and [Shrunk] 2 to ALL enemies. Exhaust.`,
    play: (x) => {
      x.applyAllEnemies('dizzy', 1);
      x.applyAllEnemies('shrunk', 2);
    },
  },

  // ---------------- partner combos ----------------
  {
    id: 'scoutReport', name: 'Scout Report', owner: 'goombario', combo: 'parakarry', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'cast', icon: 'i_letter',
    text: (up) => `Apply [Soft] {${v(up, 1, 2)}} to ALL enemies. [Combo] Parakarry: draw 2 cards.`,
    play: (x, up) => {
      x.applyAllEnemies('soft', v(up, 1, 2));
      if (x.withPartner('parakarry')) x.draw(2);
    },
  },
  {
    id: 'shellBomb', name: 'Shell Bomb', owner: 'kooper', combo: 'bombette', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ground', anim: 'shell', icon: 'b_247',
    text: (up) => `Kooper deals {${v(up, 7, 10)}} damage to every ground foe. [Combo] Bombette: [Pierce], and it hits [Flying] foes too.`,
    play: (x, up) => {
      const combo = x.withPartner('bombette');
      x.attackAll(v(up, 7, 10), combo ? { kind: 'ranged', pierce: true, contact: false, fire: true } : { kind: 'ground' });
    },
  },
  {
    id: 'liveWire', name: 'Live Wire', owner: 'bombette', combo: 'watt', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'bomb', icon: 'st_static',
    text: (up) => `Deal {${v(up, 7, 10)}} damage to ALL enemies. [Pierce]. [Combo] Watt: apply [Dizzy] 1 to a random enemy.`,
    play: (x, up) => {
      x.attackAll(v(up, 7, 10), { kind: 'ranged', pierce: true, contact: false, fire: true });
      const live = x.enemies;
      if (x.withPartner('watt') && live.length) x.apply('dizzy', 1, x.c.rng.pick(live));
    },
  },
  {
    id: 'airSuperiority', name: 'Air Strike', owner: 'parakarry', combo: 'lakilester', type: 'attack', rarity: 'uncommon', cost: 2, target: 'allEnemies', atk: 'ranged', anim: 'dash', icon: 'cloud',
    text: (up) => `Deal {${v(up, 6, 8)}} damage to ALL enemies. [Combo] Lakilester: hit them twice.`,
    play: (x, up) => void x.attackAll(v(up, 6, 8), { kind: 'ranged', contact: false, hits: x.withPartner('lakilester') ? 2 : 1 }),
  },
  {
    id: 'ghostStory', name: 'Ghost Story', owner: 'bow', combo: 'goombario', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'cast', icon: 'b_162',
    text: (up) => `Apply [Shrunk] {${v(up, 2, 3)}} to ALL enemies. [Combo] Goombario: also apply [Soft] 1 to ALL enemies.`,
    play: (x, up) => {
      x.applyAllEnemies('shrunk', v(up, 2, 3));
      if (x.withPartner('goombario')) x.applyAllEnemies('soft', 1);
    },
  },
  {
    id: 'phantomShock', name: 'Phantom Shock', owner: 'watt', combo: 'bow', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', atk: 'ranged', anim: 'zap', icon: 'b_299',
    text: (up) => `Watt deals {${v(up, 7, 10)}} damage. [Pierce]. [Combo] Bow: Mario becomes [Hidden] until your next turn.`,
    play: (x, up) => {
      x.attack(v(up, 7, 10), { kind: 'ranged', pierce: true });
      if (x.withPartner('bow')) x.apply('hidden', 1, x.mario);
    },
  },
  {
    id: 'tidalShell', name: 'Tidal Shell', owner: 'sushie', combo: 'kooper', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', anim: 'cast', icon: 'shell',
    text: (up) => `Every ally gains {${v(up, 5, 7)}} [Block]. [Combo] Kooper: Mario gains {${v(up, 6, 8)}} more.`,
    play: (x, up) => {
      x.blockAll(v(up, 5, 7));
      if (x.withPartner('kooper')) x.block(v(up, 6, 8));
    },
  },
  {
    id: 'rainstorm', name: 'Rainstorm', owner: 'lakilester', combo: 'sushie', type: 'attack', rarity: 'uncommon', cost: 1, target: 'allEnemies', atk: 'ranged', anim: 'throw', icon: 'b_240',
    text: (up) => `Deal {${v(up, 3, 4)}} damage to a random enemy 4 times. [Combo] Sushie: heal every ally 3.`,
    play: (x, up) => {
      x.attackRandom(v(up, 3, 4), 4, { kind: 'ranged', contact: false });
      if (x.withPartner('sushie')) x.healAll(3);
    },
  },

  // ---------------- status / curses ----------------
  {
    id: 'dazed', name: 'Dazed', owner: 'none', type: 'status', rarity: 'special', cost: 0, target: 'none', icon: 'st_dizzy', unplayable: true, ethereal: true,
    text: () => `Unplayable. Ethereal.`,
    play: () => {},
  },
  {
    id: 'haunted', name: 'Haunted', owner: 'none', type: 'curse', rarity: 'special', cost: 0, target: 'none', icon: 'st_skull', unplayable: true,
    text: () => `Unplayable. If this is in your hand at the end of your turn, Mario loses 2 HP.`,
    play: () => {},
    endOfTurnInHand: (c) => c.loseHp(c.mario, 2),
  },
  {
    id: 'frozen', name: 'Frostbite', owner: 'none', type: 'status', rarity: 'special', cost: 1, target: 'none', icon: 'st_frozen', exhaust: true,
    text: () => `Exhaust. (Shake off the chill.)`,
    play: () => {},
  },
];
