import type { EnemyDef, MoveDef } from '../engine/defs';
import type { Combat } from '../engine/combat';
import type { Unit } from '../engine/types';

// ---------- AI helpers ----------

/** Fixed rotation of moves. */
const cycle =
  (...ids: string[]) =>
  (self: Unit) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    return ids[self.mem.turn % ids.length];
  };

/** Weighted random, never the same move three times in a row. */
const rand =
  (...pairs: [string, number][]) =>
  (self: Unit, c: Combat) => {
    const h: string[] = self.mem.history ?? [];
    const banned = h.length >= 2 && h[h.length - 1] === h[h.length - 2] ? h[h.length - 1] : null;
    const pool = pairs.filter(([id]) => id !== banned);
    return c.rng.weighted(pool.length ? pool : pairs);
  };

const minions = (c: Combat) => c.livingEnemies().filter((e) => e.traits.includes('minion')).length;

const atk = (name: string, dmg: number, tgt: MoveDef['tgt'] = 'random', extra: Partial<MoveDef> = {}): MoveDef => ({
  name,
  kind: 'attack',
  dmg,
  tgt,
  anim: 'lunge',
  ...extra,
});

const lightFuse = (self: Unit, c: Combat) => {
  if (self.dead || self.mem.lit) return;
  self.mem.lit = true;
  c.emit({ t: 'text', target: self.uid, text: 'Fuse lit!', color: '#ff7a3c' });
  c.emit({ t: 'pose', target: self.uid, pose: 'lit' });
  self.pose = 'lit';
  c.setIntent(self, 'explode');
};

const explode = (c: Combat, self: Unit) => {
  c.emit({ t: 'text', target: self.uid, text: 'KABOOM!', color: '#ff5a2a' });
  c.kill(self, {});
};

/** Copy a definition under a new id with more HP / damage (for later acts). */
function scaled(base: EnemyDef, id: string, hpMul: number, dmgAdd: number, patch: Partial<EnemyDef> = {}): EnemyDef {
  const moves: Record<string, MoveDef> = {};
  for (const [k, m] of Object.entries(base.moves)) moves[k] = m.dmg ? { ...m, dmg: m.dmg + dmgAdd } : m;
  return {
    ...base,
    id,
    hp: [Math.round(base.hp[0] * hpMul), Math.round(base.hp[1] * hpMul)],
    moves,
    ...patch,
  };
}

// ---------- Act 1 ----------

const goomba: EnemyDef = {
  id: 'goomba', name: 'Goomba', sprite: 'goomba', hp: [12, 15],
  desc: 'A humble Goomba. Headbonks anyone in reach.',
  moves: { bonk: atk('Headbonk', 6), power: atk('Power Bonk', 9, 'mario', { anim: 'jump' }) },
  ai: rand(['bonk', 3], ['power', 1]),
};

const paragoomba: EnemyDef = {
  id: 'paragoomba', name: 'Paragoomba', sprite: 'paragoomba', hp: [10, 12], traits: ['flying', 'winged'],
  desc: "Flying: Hammers can't reach it. Jump on it to knock its wings off.",
  moves: { dive: atk('Dive Bomb', 6), swoop: atk('Swoop', 3, 'random', { hits: 2 }), bonk: atk('Headbonk', 6) },
  ai: (self, c) => (self.mem.grounded ? 'bonk' : rand(['dive', 2], ['swoop', 1])(self, c)),
};

const koopa: EnemyDef = {
  id: 'koopa', name: 'Koopa Troopa', sprite: 'koopa', hp: [14, 17], traits: ['shelled'], armor: 2,
  desc: 'Shelled (2 armor). Jump on it to flip it over.',
  moves: { toss: atk('Shell Toss', 8), withdraw: { name: 'Withdraw', kind: 'defend', tgt: 'self', block: 7, anim: 'none' } },
  ai: rand(['toss', 3], ['withdraw', 1]),
};

const bobomb: EnemyDef = {
  id: 'bobomb', name: 'Bob-omb', sprite: 'bobomb', hp: [11, 13], traits: ['explosive'],
  desc: 'Hurting it lights its fuse: it explodes next turn unless finished off.',
  moves: {
    slam: atk('Body Slam', 6),
    explode: { name: 'Explode', kind: 'explode', dmg: 14, tgt: 'random', anim: 'lunge', contact: false, fx: (c, self) => explode(c, self) },
  },
  ai: (self) => (self.mem.lit ? 'explode' : 'slam'),
  onHurt: (self, c) => lightFuse(self, c),
};

const bobombBlue: EnemyDef = {
  id: 'bobomb_blue', name: 'Bob-omb Sergeant', sprite: 'bobomb_blue', hp: [30, 34], traits: ['explosive'],
  desc: "Lights his squad's fuses. Hurting him lights his own: a big blast.",
  moves: {
    slam: atk('Body Slam', 8),
    ignite: {
      name: 'Ignite!', kind: 'buff', tgt: 'none', anim: 'cast',
      fx: (c, self) => {
        for (const e of c.livingEnemies()) if (e !== self && e.id === 'bobomb') lightFuse(e, c);
      },
    },
    explode: { name: 'Big Bang', kind: 'explode', dmg: 20, tgt: 'random', anim: 'lunge', contact: false, fx: (c, self) => explode(c, self) },
  },
  ai: (self, c) => {
    if (self.mem.lit) return 'explode';
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    const unlit = c.livingEnemies().some((e) => e.id === 'bobomb' && !e.mem.lit);
    return self.mem.turn % 2 === 1 && unlit ? 'ignite' : 'slam';
  },
  onHurt: (self, c) => {
    if (self.hp <= self.maxHp / 2) lightFuse(self, c);
  },
};

const piranha: EnemyDef = {
  id: 'piranha', name: 'Piranha Plant', sprite: 'piranha', hp: [15, 18], traits: ['spiky'],
  desc: 'Spiky: jumping on it hurts.',
  moves: { bite: atk('Bite', 9), chomp: atk('Chomp', 5, 'random', { apply: [['soft', 1, 'target']] }) },
  ai: rand(['bite', 2], ['chomp', 1]),
};

const bubulbGreen: EnemyDef = {
  id: 'bubulb_green', name: 'Green Bub-ulb', sprite: 'bubulb_green', hp: [10, 12],
  desc: 'Heals its friends.',
  moves: {
    spit: atk('Seed Spit', 4, 'random', { contact: false, anim: 'shoot' }),
    nourish: {
      name: 'Nourish', kind: 'heal', tgt: 'none', anim: 'cast',
      fx: (c) => {
        for (const e of c.livingEnemies()) c.heal(e, 6);
      },
    },
  },
  ai: cycle('spit', 'nourish'),
};

const bubulbYellow: EnemyDef = {
  id: 'bubulb_yellow', name: 'Yellow Bub-ulb', sprite: 'bubulb_yellow', hp: [10, 12],
  desc: 'Shields its friends.',
  moves: {
    spit: atk('Seed Spit', 5, 'random', { contact: false, anim: 'shoot' }),
    bloom: {
      name: 'Bloom', kind: 'defend', tgt: 'none', anim: 'cast',
      fx: (c) => {
        for (const e of c.livingEnemies()) c.gainBlock(e, 5);
      },
    },
  },
  ai: cycle('bloom', 'spit'),
};

const bubulbPink: EnemyDef = {
  id: 'bubulb_pink', name: 'Pink Bub-ulb', sprite: 'bubulb_pink', hp: [13, 15],
  desc: 'Its pollen makes your team Soft.',
  moves: {
    spit: atk('Seed Spit', 7, 'random', { contact: false, anim: 'shoot' }),
    pollen: { name: 'Pollen', kind: 'debuff', tgt: 'all', anim: 'cast', apply: [['soft', 1, 'target']] },
  },
  ai: cycle('pollen', 'spit', 'spit'),
};

const bubulbBlue: EnemyDef = {
  id: 'bubulb_blue', name: 'Blue Bub-ulb', sprite: 'bubulb_blue', hp: [13, 15],
  desc: 'Its spray Shrinks your team.',
  moves: {
    spit: atk('Seed Spit', 7, 'random', { contact: false, anim: 'shoot' }),
    drench: { name: 'Drench', kind: 'debuff', tgt: 'all', anim: 'cast', apply: [['shrunk', 1, 'target']] },
  },
  ai: cycle('drench', 'spit', 'spit'),
};

const bandit: EnemyDef = {
  id: 'bandit', name: 'Bandit', sprite: 'bandit', hp: [18, 20],
  desc: 'Steals coins, then runs. Defeat it to get them back.',
  moves: {
    steal: atk('Mug', 6, 'mario', { fx: (c, self) => c.steal(self, 15) }),
    smoke: { name: 'Smoke Bomb', kind: 'defend', tgt: 'self', block: 10, anim: 'none' },
    escape: { name: 'Escape', kind: 'escape', tgt: 'none', anim: 'none', fx: (c, self) => c.flee(self) },
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'steal';
    if (self.mem.turn === 1) return c.rng.chance(0.5) ? 'steal' : 'smoke';
    return 'escape';
  },
};

const babyBuzzar: EnemyDef = {
  id: 'babybuzzar', name: 'Baby Buzzar', sprite: 'babybuzzar', hp: [7, 9], traits: ['flying'],
  desc: 'Flying hatchling.',
  moves: { peck: atk('Peck', 4) },
  ai: () => 'peck',
};

const hammerbro: EnemyDef = {
  id: 'hammerbro', name: 'Hammer Bro', sprite: 'hammerbro', hp: [44, 48],
  desc: 'Elite. Hammers rain down; it psyches itself up.',
  moves: {
    throw: atk('Hammer Throw', 5, 'random', { hits: 2, contact: false, anim: 'shoot' }),
    barrage: atk('Hammer Barrage', 3, 'random', { hits: 4, contact: false, anim: 'shoot' }),
    psych: { name: 'Psych Up', kind: 'buff', tgt: 'self', anim: 'cast', apply: [['strength', 2, 'self']] },
  },
  ai: cycle('throw', 'barrage', 'psych'),
};

const goombaKing: EnemyDef = {
  id: 'goombaking', name: 'Goomba King', sprite: 'goombaking', hp: [140, 140], traits: ['boss'],
  desc: 'Boss. Calls Goomba guards and rallies them.',
  moves: {
    summon: {
      name: 'Royal Guard', kind: 'summon', tgt: 'none', anim: 'cast',
      fx: (c) => {
        c.summon('goomba');
        c.summon('goomba');
      },
    },
    stomp: atk('Royal Stomp', 14, 'mario', { anim: 'jump' }),
    shake: atk('Tree Shake', 5, 'all', { contact: false, anim: 'cast' }),
    cheer: {
      name: "King's Cheer", kind: 'buff', tgt: 'none', anim: 'cast',
      fx: (c) => {
        for (const e of c.livingEnemies()) c.applyStatus(e, 'strength', 2);
      },
    },
    charge: atk('Royal Charge', 16, 'mario'),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'summon';
    const r = ['stomp', 'shake', 'cheer'][(self.mem.turn - 1) % 3];
    if (r === 'cheer' && minions(c) === 0) return 'summon';
    return r;
  },
  phase2: {
    name: 'Royal Rage!',
    desc: 'Enraged: stronger, and charges with his whole royal weight.',
    enter: (self, c) => {
      c.applyStatus(self, 'strength', 2);
      c.summon('goomba');
    },
    ai: (self, c) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      const r = ['charge', 'shake', 'stomp', 'cheer'][self.mem.turn % 4];
      if (r === 'cheer' && minions(c) === 0) return 'summon';
      return r;
    },
  },
};

const buzzar: EnemyDef = {
  id: 'buzzar', name: 'Buzzar', sprite: 'buzzar', hp: [130, 130], traits: ['boss'],
  desc: 'Boss. Its gusts Shrink your team; it calls hatchlings.',
  moves: {
    gust: atk('Wind Blast', 5, 'all', { contact: false, anim: 'cast', apply: [['shrunk', 1, 'target']] }),
    grab: atk('Snatch', 15, 'partner', { anim: 'jump' }),
    peck: atk('Peck Flurry', 4, 'random', { hits: 3 }),
    dive: atk('Dive Bomb', 18, 'random', { anim: 'jump' }),
    hatch: {
      name: 'Call Babies', kind: 'summon', tgt: 'none', anim: 'cast',
      fx: (c) => {
        c.summon('babybuzzar');
        c.summon('babybuzzar');
      },
    },
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'gust';
    const r = ['grab', 'peck', 'hatch'][(self.mem.turn - 1) % 3];
    if (r === 'hatch' && minions(c) > 0) return 'gust';
    return r;
  },
  phase2: {
    name: 'Takes to the sky!',
    desc: "Airborne: now Flying, so Hammers can't reach. Dive-bombs from above.",
    enter: (self, c) => {
      if (!self.traits.includes('flying')) self.traits.push('flying');
      c.emit({ t: 'text', target: self.uid, text: 'Flying!', color: '#9fe3ff' });
    },
    ai: (self, c) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      const r = ['dive', 'gust', 'peck', 'hatch'][self.mem.turn % 4];
      if (r === 'hatch' && minions(c) > 0) return 'grab';
      return r;
    },
  },
};

const lily: EnemyDef = {
  id: 'lily', name: 'Withered Lily', sprite: 'lily', hp: [130, 130], traits: ['boss'],
  desc: 'Boss. Sprouts Bub-ulbs, softens your team, and blooms to heal.',
  moves: {
    garden: {
      name: 'Sprout', kind: 'summon', tgt: 'none', anim: 'cast',
      fx: (c) => {
        c.summon(c.rng.pick(['bubulb_green', 'bubulb_yellow']));
        c.summon(c.rng.pick(['bubulb_green', 'bubulb_yellow']));
      },
    },
    petals: atk('Petal Storm', 3, 'random', { hits: 4, contact: false, anim: 'cast' }),
    pollen: { name: 'Pollen Cloud', kind: 'debuff', tgt: 'all', anim: 'cast', apply: [['soft', 2, 'target']] },
    bloom: { name: 'Full Bloom', kind: 'heal', tgt: 'self', anim: 'cast', block: 12, fx: (c, self) => c.heal(self, 15) },
    lash: atk('Thorn Lash', 13, 'random'),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'garden';
    const r = ['petals', 'pollen', 'lash', 'bloom'][(self.mem.turn - 1) % 4];
    if (r === 'bloom' && minions(c) === 0) return 'garden';
    return r;
  },
  phase2: {
    name: 'Full Bloom!',
    desc: 'In full bloom: gains Strength at the end of each of her turns.',
    enter: (self, c) => {
      c.applyStatus(self, 'growth', 1);
      c.summon(c.rng.pick(['bubulb_green', 'bubulb_yellow']));
    },
    ai: (self) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      return ['lash', 'petals', 'pollen'][self.mem.turn % 3];
    },
  },
};

// ---------- Act 2 ----------

const buzzy: EnemyDef = {
  id: 'buzzy', name: 'Buzzy Beetle', sprite: 'buzzy', hp: [16, 19], traits: ['shelled'], armor: 3,
  desc: 'Shelled (3 armor). Flip it with a Jump.',
  moves: { bite: atk('Bite', 9), spin: atk('Shell Spin', 5, 'random', { hits: 2 }) },
  ai: rand(['bite', 2], ['spin', 1]),
};

const swooper: EnemyDef = {
  id: 'swooper', name: 'Swooper', sprite: 'swooper', hp: [13, 15], traits: ['flying'],
  desc: 'Flying. Drains HP when it bites.',
  moves: {
    swoop: atk('Leech Swoop', 7, 'random', { fx: (c, self) => c.heal(self, 4) }),
    hang: { name: 'Hang Around', kind: 'defend', tgt: 'self', block: 6, anim: 'none' },
  },
  ai: rand(['swoop', 3], ['hang', 1]),
};

const drybones: EnemyDef = {
  id: 'drybones', name: 'Dry Bones', sprite: 'drybones', hp: [17, 20], traits: ['undead'],
  desc: 'Collapses when beaten and rebuilds 2 turns later. Fire or Pierce destroys it for good.',
  moves: {
    toss: atk('Bone Toss', 8, 'random', { contact: false, anim: 'shoot' }),
    rattle: { name: 'Rattle', kind: 'defend', tgt: 'self', block: 7, anim: 'none' },
  },
  ai: rand(['toss', 3], ['rattle', 1]),
  onDeath: (self, c, how) => {
    if (how.fire || how.pierce) return false;
    self.dead = true;
    self.block = 0;
    self.st = {};
    self.mem.revive = 2;
    self.pose = 'pile';
    self.intent = undefined;
    c.emit({ t: 'pose', target: self.uid, pose: 'pile' });
    c.emit({ t: 'text', target: self.uid, text: 'Collapsed...', color: '#ccc' });
    return true;
  },
};

const boo: EnemyDef = {
  id: 'boo', name: 'Boo', sprite: 'boo', hp: [14, 16],
  desc: 'Can Vanish: each hit deals at most 1 damage.',
  moves: {
    spook: atk('Spook', 6, 'random', { apply: [['shrunk', 1, 'target']] }),
    vanish: { name: 'Vanish', kind: 'defend', tgt: 'self', anim: 'none', apply: [['vanish', 1, 'self']] },
    lick: atk('Lick', 8),
  },
  ai: rand(['spook', 2], ['lick', 2], ['vanish', 1]),
};

const bulletbill: EnemyDef = {
  id: 'bulletbill', name: 'Bullet Bill', sprite: 'bulletbill', hp: [7, 9], traits: ['flying'],
  desc: 'Locks on, then slams into its target and explodes. Shoot it down first!',
  moves: {
    aim: { name: 'Locking On', kind: 'unknown', tgt: 'none', anim: 'none' },
    impact: { name: 'Impact', kind: 'explode', dmg: 12, tgt: 'random', anim: 'lunge', contact: false, fx: (c, self) => explode(c, self) },
  },
  init: (self, c) => {
    self.mem.countdown = c.rng.int(1, 2);
  },
  ai: (self) => {
    if (self.mem.countdown > 0) {
      self.mem.countdown--;
      return 'aim';
    }
    return 'impact';
  },
};

const clubba: EnemyDef = {
  id: 'clubba', name: 'Clubba', sprite: 'clubba', hp: [32, 36],
  desc: 'Heavy hitter that dozes off between swings.',
  moves: {
    club: atk('Club Smash', 13),
    swing: atk('Wild Swing', 6, 'random', { hits: 2 }),
    snooze: { name: 'Snooze', kind: 'sleep', tgt: 'self', anim: 'none', fx: (c, self) => c.heal(self, 6) },
  },
  ai: cycle('club', 'swing', 'snooze'),
};

const albino: EnemyDef = {
  id: 'albino', name: 'Albino Dino', sprite: 'albino', hp: [68, 74],
  desc: 'Elite. Its icy breath chills Mario: lose FP next turn.',
  moves: {
    stomp: atk('Stomp', 16, 'random', { anim: 'jump' }),
    breath: atk('Freeze Breath', 6, 'all', { contact: false, anim: 'cast', apply: [['chill', 1, 'target']] }),
    roar: { name: 'Roar', kind: 'buff', tgt: 'self', anim: 'cast', apply: [['strength', 3, 'self']] },
  },
  ai: cycle('stomp', 'breath', 'stomp', 'roar'),
};

const bigBoo: EnemyDef = {
  id: 'gustyboo', name: 'Big Boo', sprite: 'gustyboo', hp: [50, 56], size: 1.3,
  desc: 'Elite. Calls more Boos and terrifies your team.',
  moves: {
    scare: atk('Scare', 10, 'random', { apply: [['shrunk', 2, 'target']] }),
    swarm: { name: 'Boo Swarm', kind: 'summon', tgt: 'none', anim: 'cast', fx: (c) => void c.summon('boo') },
    vanish: { name: 'Vanish', kind: 'defend', tgt: 'self', anim: 'none', apply: [['vanish', 1, 'self']], block: 8 },
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'swarm';
    const r = ['scare', 'vanish', 'swarm'][(self.mem.turn - 1) % 3];
    if (r === 'swarm' && minions(c) >= 2) return 'scare';
    return r;
  },
};

const tubba: EnemyDef = {
  id: 'tubba', name: 'Tubba Blubba', sprite: 'tubba', hp: [210, 210], traits: ['boss'], armor: 1,
  desc: 'Boss. Thick hide (1 armor). Gobbles partners to heal.',
  moves: {
    slam: atk('Body Slam', 20, 'mario', { anim: 'jump' }),
    quake: atk('Earthquake', 7, 'all', { contact: false, anim: 'jump' }),
    gobble: atk('Gobble', 13, 'partner', { fx: (c, self) => c.heal(self, 12) }),
    flex: { name: 'Flex', kind: 'buff', tgt: 'self', anim: 'cast', block: 20, apply: [['strength', 2, 'self']] },
  },
  ai: cycle('slam', 'quake', 'gobble', 'flex'),
  phase2: {
    name: 'Loses his cool!',
    desc: 'Furious: his thick hide cracked (no armor), but he hits much harder.',
    enter: (self, c) => {
      self.armor = 0;
      c.applyStatus(self, 'strength', 2);
      c.emit({ t: 'text', target: self.uid, text: 'Armor cracked!', color: '#9fe3ff' });
    },
    ai: cycle('quake', 'gobble', 'slam', 'flex'),
  },
};

const gourmet: EnemyDef = {
  id: 'gourmet', name: 'Gourmet Guy', sprite: 'gourmet', hp: [195, 195], traits: ['boss'],
  desc: 'Boss. Feasts to heal and grow stronger. Hit him hard before dessert.',
  moves: {
    cutlery: atk('Fork & Knife', 6, 'random', { hits: 3 }),
    belly: atk('Belly Bounce', 10, 'all', { anim: 'jump' }),
    feast: { name: 'Feast', kind: 'buff', tgt: 'self', anim: 'cast', apply: [['strength', 2, 'self']], fx: (c, self) => c.heal(self, 15) },
    cake: atk('Cake Toss', 8, 'all', { contact: false, anim: 'cast', apply: [['soft', 1, 'target']] }),
  },
  ai: cycle('cutlery', 'belly', 'cutlery', 'feast'),
  phase2: {
    name: 'Second helping!',
    desc: 'Dessert time: tosses cakes that make your team Soft.',
    enter: (self, c) => c.gainBlock(self, 25),
    ai: cycle('cake', 'cutlery', 'belly', 'feast'),
  },
};

const raphael: EnemyDef = {
  id: 'raphael', name: 'Raphael the Raven', sprite: 'raphael', hp: [220, 220], traits: ['boss'],
  desc: 'Boss. Summons Swoopers and buffets your team with wind.',
  moves: {
    peck: atk('Raven Peck', 19, 'random'),
    gale: atk('Wing Gale', 7, 'all', { contact: false, anim: 'cast', apply: [['shrunk', 1, 'target']] }),
    call: {
      name: 'Call the Flock', kind: 'summon', tgt: 'none', anim: 'cast',
      fx: (c) => {
        c.summon('swooper');
        c.summon('swooper');
      },
    },
    perch: { name: 'Perch', kind: 'defend', tgt: 'self', anim: 'none', block: 18 },
    talon: atk('Talon Dive', 9, 'random', { hits: 2, anim: 'jump' }),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'call';
    const r = ['peck', 'gale', 'call'][(self.mem.turn - 1) % 3];
    if (r === 'call' && minions(c) > 0) return 'perch';
    return r;
  },
  phase2: {
    name: 'Storm of wings!',
    desc: 'The whole flock is coming. Talon dives strike twice.',
    enter: (_self, c) => {
      c.summon('swooper');
      c.summon('swooper');
    },
    ai: (self, c) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      const r = ['talon', 'gale', 'peck', 'call'][self.mem.turn % 4];
      if (r === 'call' && minions(c) > 0) return 'talon';
      return r;
    },
  },
};

// ---------- Act 3 ----------

const ninji: EnemyDef = {
  id: 'ninji', name: 'Ninji', sprite: 'ninji', hp: [20, 24],
  desc: 'Quick ice ninja. Chills Mario.',
  moves: {
    flurry: atk('Flurry', 4, 'random', { hits: 3 }),
    ice: atk('Ice Ball', 9, 'random', { contact: false, anim: 'shoot', apply: [['chill', 1, 'target']] }),
    leap: { name: 'Ninja Leap', kind: 'buff', tgt: 'self', anim: 'jump', block: 8, apply: [['charge', 5, 'self']] },
  },
  ai: rand(['flurry', 2], ['ice', 2], ['leap', 1]),
};

/** Bowser gets angry (once) when Kammy is gone. */
const bowserEnrage = (self: Unit, c: Combat) => {
  const kammyDown = !c.livingEnemies().some((e) => e.id === 'kammy');
  if (kammyDown && !self.mem.enraged && (self.mem.turn > 0 || self.mem.phase2)) {
    self.mem.enraged = true;
    c.applyStatus(self, 'strength', 3);
    c.emit({ t: 'text', target: self.uid, text: 'Bowser is enraged!', color: '#ff5a2a' });
  }
};
const anyBuffed = (c: Combat) => c.livingAllies().some((a) => (a.st.strength ?? 0) > 0 || (a.st.static ?? 0) > 0);

const bowser: EnemyDef = {
  id: 'bowser', name: 'Bowser', sprite: 'bowser', hp: [290, 290], traits: ['boss', 'spiky'],
  desc: 'Final boss. Spiky shell: jumping on him hurts. Enrages when Kammy falls.',
  moves: {
    claw: atk('Claw Swipe', 16, 'random'),
    fire: atk('Fire Breath', 8, 'all', { contact: false, anim: 'cast', apply: [['burn', 2, 'target']] }),
    spin: atk('Shell Spin', 5, 'random', { hits: 4 }),
    rod: atk('Star Rod Blast', 13, 'all', { contact: false, anim: 'cast' }),
    power: { name: 'Power Up', kind: 'buff', tgt: 'self', anim: 'cast', block: 15, apply: [['strength', 2, 'self']] },
    shock: atk('Shockwave', 6, 'all', {
      contact: false, anim: 'jump',
      fx: (c) => {
        for (const a of c.livingAllies()) {
          a.block = 0;
          delete a.st.strength;
          delete a.st.charge;
          delete a.st.static;
        }
        c.emit({ t: 'text', target: 'mario', text: 'Buffs shattered!', color: '#ff7070' });
      },
    }),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    bowserEnrage(self, c);
    const seq = ['claw', 'fire', 'spin', 'power', 'claw', anyBuffed(c) ? 'shock' : 'spin'];
    return seq[self.mem.turn % seq.length];
  },
  phase2: {
    name: 'Star Rod power!',
    desc: 'Powered by the Star Rod: gains Strength every turn and blasts your whole team.',
    enter: (self, c) => {
      c.gainBlock(self, 30);
      c.applyStatus(self, 'growth', 1);
    },
    ai: (self, c) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      bowserEnrage(self, c);
      const seq = ['rod', 'claw', 'spin', 'fire', anyBuffed(c) ? 'shock' : 'claw'];
      return seq[self.mem.turn % seq.length];
    },
  },
};

const kammy: EnemyDef = {
  id: 'kammy', name: 'Kammy Koopa', sprite: 'kammy', hp: [70, 70], traits: ['flying', 'minion'],
  desc: "Flying on her broom. Powers up and heals Bowser. Bowser enrages if she falls.",
  moves: {
    blast: atk('Magic Blast', 9, 'random', { contact: false, anim: 'shoot' }),
    empower: {
      name: 'Power Bowser', kind: 'buff', tgt: 'none', anim: 'cast',
      fx: (c) => {
        const b = c.livingEnemies().find((e) => e.id === 'bowser');
        if (b) {
          c.applyStatus(b, 'strength', 1);
          c.gainBlock(b, 15);
        }
      },
    },
    heal: {
      name: 'Heal Bowser', kind: 'heal', tgt: 'none', anim: 'cast',
      fx: (c) => {
        const b = c.livingEnemies().find((e) => e.id === 'bowser');
        if (b) c.heal(b, 15);
      },
    },
  },
  ai: cycle('blast', 'empower', 'blast', 'heal'),
};

// ---------- Bowser's run: the final boss is Mario ----------

const marioEnrage = (self: Unit, c: Combat) => {
  const luigiDown = !c.livingEnemies().some((e) => e.id === 'luigi_boss');
  if (luigiDown && !self.mem.enraged && (self.mem.turn > 0 || self.mem.phase2)) {
    self.mem.enraged = true;
    c.applyStatus(self, 'strength', 3);
    c.emit({ t: 'text', target: self.uid, text: 'Mario is furious!', color: '#ff5a2a' });
  }
};

const marioBoss: EnemyDef = {
  id: 'mario_boss', name: 'Mario', sprite: 'mario', hp: [340, 340], traits: ['boss'],
  desc: 'Final boss of Bowser\'s run. The hero himself. Gets serious if Luigi falls.',
  moves: {
    jump: atk('Super Jump', 9, 'random', { hits: 2, anim: 'jump' }),
    hammer: atk('Ultra Hammer', 26, 'mario', { anim: 'lunge' }),
    beam: atk('Star Beam', 10, 'all', { contact: false, anim: 'cast', apply: [['soft', 1, 'target']] }),
    focus: { name: 'Focus', kind: 'buff', tgt: 'self', anim: 'cast', block: 20, apply: [['strength', 2, 'self']] },
    storm: atk('Star Storm', 7, 'all', { hits: 2, contact: false, anim: 'cast' }),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    marioEnrage(self, c);
    return ['jump', 'hammer', 'beam', 'focus'][self.mem.turn % 4];
  },
  phase2: {
    name: 'The Star Spirits answer!',
    desc: 'Blessed by the Star Spirits: gains Strength every turn and calls down Star Storms.',
    enter: (self, c) => {
      c.gainBlock(self, 30);
      c.applyStatus(self, 'growth', 1);
    },
    ai: (self, c) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      marioEnrage(self, c);
      return ['storm', 'hammer', 'jump', 'beam'][self.mem.turn % 4];
    },
  },
};

const luigiBoss: EnemyDef = {
  id: 'luigi_boss', name: 'Luigi', sprite: 'luigi', hp: [80, 80], traits: ['minion'],
  desc: "Mario's brother. Cheers him on and patches him up. Mario gets serious if Luigi falls.",
  moves: {
    jump: atk('Luigi Jump', 10, 'random', { anim: 'jump' }),
    cheer: {
      name: 'Go, Bro!', kind: 'buff', tgt: 'none', anim: 'cast',
      fx: (c) => {
        const m = c.livingEnemies().find((e) => e.id === 'mario_boss');
        if (m) c.applyStatus(m, 'strength', 1);
      },
    },
    patch: {
      name: 'Mushroom', kind: 'heal', tgt: 'none', anim: 'cast',
      fx: (c) => {
        const m = c.livingEnemies().find((e) => e.id === 'mario_boss');
        if (m) c.heal(m, 20);
      },
    },
  },
  ai: cycle('jump', 'cheer', 'jump', 'patch'),
};

// ---------- new foes from the custom sheets ----------

const cheepCheep: EnemyDef = {
  id: 'cheepcheep', name: 'Cheep Cheep', sprite: 'cheepcheep', hp: [11, 13],
  desc: 'Flops at you, and its splash makes your team Soft.',
  moves: {
    flop: atk('Flop', 5),
    splash: atk('Splash', 3, 'all', { contact: false, anim: 'cast', apply: [['soft', 1, 'target']] }),
  },
  ai: cycle('flop', 'splash', 'flop'),
};

const mander: EnemyDef = {
  id: 'mander', name: 'Mander', sprite: 'mander', hp: [18, 21],
  desc: 'A fire salamander. Its Flame Spit makes you Burn.',
  moves: {
    bite: atk('Bite', 8),
    spit: atk('Flame Spit', 5, 'random', { contact: false, anim: 'shoot', apply: [['burn', 2, 'target']] }),
  },
  ai: rand(['bite', 2], ['spit', 2]),
};

const cherbil: EnemyDef = {
  id: 'cherbil', name: 'Cherbil', sprite: 'cherbil', hp: [16, 19], traits: ['flying'],
  desc: "Floating gas cloud (Flying). Its poison puff Shrinks your team.",
  moves: {
    gas: atk('Poison Puff', 4, 'all', { contact: false, anim: 'cast', apply: [['shrunk', 1, 'target']] }),
    bump: atk('Bump', 7),
  },
  ai: cycle('gas', 'bump', 'bump'),
};

const slugger: EnemyDef = {
  id: 'slugger', name: 'Slugger', sprite: 'slugger', hp: [24, 28],
  desc: 'Swings a big bat. Its Home Run knocks a Dazed card into your deck.',
  moves: {
    swing: atk('Big Swing', 12, 'mario'),
    homer: atk('Home Run', 8, 'random', { fx: (c) => c.addCardToDraw('dazed') }),
    wind: { name: 'Wind Up', kind: 'buff', tgt: 'self', anim: 'none', block: 6, apply: [['strength', 2, 'self']] },
  },
  ai: cycle('wind', 'swing', 'homer'),
};

const dimentioClone: EnemyDef = {
  id: 'dimentio_clone', name: 'Dimentio Copy', sprite: 'dimentio', tint: 'opacity(0.65) saturate(0.6)', size: 0.6, hp: [18, 20], traits: ['minion', 'flying'],
  desc: 'A magical copy. Vanishes when Dimentio falls.',
  moves: { zap: atk('Copy Zap', 6, 'random', { contact: false, anim: 'shoot' }) },
  ai: () => 'zap',
};

const dimentio: EnemyDef = {
  id: 'dimentio', name: 'Dimentio', sprite: 'dimentio', hp: [200, 200], traits: ['boss', 'flying'],
  desc: 'Boss. Master of dimensions: splits into copies, teleports, and traps partners in a Dimension Box.',
  moves: {
    copy: {
      name: 'Copy Clone', kind: 'summon', tgt: 'none', anim: 'cast',
      fx: (c) => {
        c.summon('dimentio_clone');
      },
    },
    magic: atk('Magic Burst', 8, 'random', { hits: 2, contact: false, anim: 'shoot' }),
    box: atk('Dimension Box', 10, 'partner', { contact: false, anim: 'cast', apply: [['dizzy', 2, 'target']] }),
    teleport: { name: 'Teleport', kind: 'defend', tgt: 'self', anim: 'none', block: 10, apply: [['vanish', 1, 'self']] },
    blast: atk('Dimension Blast', 12, 'all', { contact: false, anim: 'cast' }),
  },
  ai: (self, c) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    if (self.mem.turn === 0) return 'copy';
    const r = ['magic', 'box', 'teleport', 'copy'][(self.mem.turn - 1) % 4];
    if (r === 'copy' && minions(c) >= 2) return 'magic';
    return r;
  },
  phase2: {
    name: 'Ciao!',
    desc: 'Splits into more copies and blasts your whole team.',
    enter: (_self, c) => {
      c.summon('dimentio_clone');
      c.summon('dimentio_clone');
    },
    ai: (self) => {
      self.mem.turn = (self.mem.turn ?? -1) + 1;
      return ['blast', 'box', 'magic', 'teleport'][self.mem.turn % 4];
    },
  },
};

// ---------- variants with new mechanics ----------

const thornyPiranha: EnemyDef = {
  id: 'piranha_thorn', name: 'Thorny Piranha', sprite: 'piranha', tint: 'hue-rotate(250deg) saturate(1.3)', hp: [16, 19], traits: ['spiky'],
  desc: 'Spiky. Spits Thorns into your discard pile: junk cards that hurt if you hold them.',
  moves: {
    bite: atk('Bite', 8),
    spit: atk('Thorn Spit', 4, 'random', { contact: false, anim: 'shoot', fx: (c) => { c.addCardToDiscard('thorns'); c.addCardToDiscard('thorns'); } }),
  },
  ai: cycle('spit', 'bite', 'bite'),
};

const cardShark: EnemyDef = {
  id: 'card_shark', name: 'Card Shark', sprite: 'bandit', tint: 'hue-rotate(170deg) saturate(1.4)', hp: [17, 20],
  desc: 'Steals cards from your draw pile, then runs. Defeat it to get them back.',
  moves: {
    swipe: atk('Card Swipe', 5, 'mario', { fx: (c, self) => void c.stealCard(self) }),
    shuffle: { name: 'Shuffle Off', kind: 'defend', tgt: 'self', block: 9, anim: 'none', fx: (c, self) => void c.stealCard(self) },
    escape: { name: 'Escape', kind: 'escape', tgt: 'none', anim: 'none', fx: (c, self) => c.flee(self) },
  },
  ai: (self) => {
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    return ['swipe', 'shuffle', 'escape'][Math.min(self.mem.turn, 2)];
  },
};

const phantomBoo: EnemyDef = {
  id: 'boo_phantom', name: 'Phantom Boo', sprite: 'boo', tint: 'sepia(1) hue-rotate(240deg) saturate(4) brightness(0.8)', hp: [22, 26],
  desc: 'Its Soul Drain heals it for the damage it deals.',
  moves: {
    drain: atk('Soul Drain', 8, 'random', { drain: true }),
    vanish: { name: 'Vanish', kind: 'defend', tgt: 'self', anim: 'none', apply: [['vanish', 1, 'self']] },
    wail: atk('Wail', 4, 'all', { contact: false, anim: 'cast', apply: [['shrunk', 1, 'target']] }),
  },
  ai: rand(['drain', 3], ['wail', 1], ['vanish', 1]),
};

const fireBro: EnemyDef = {
  id: 'firebro', name: 'Fire Bro', sprite: 'hammerbro', tint: 'sepia(1) saturate(5) hue-rotate(-35deg) contrast(1.1)', hp: [50, 54],
  desc: 'Elite. Fireballs Burn whoever they hit.',
  moves: {
    fireball: atk('Fireball', 6, 'random', { hits: 2, contact: false, anim: 'shoot', apply: [['burn', 2, 'target']] }),
    volley: atk('Fire Volley', 5, 'all', { contact: false, anim: 'cast', apply: [['burn', 1, 'target']] }),
    hammer: atk('Hammer Throw', 12, 'random', { contact: false, anim: 'shoot' }),
    psych: { name: 'Psych Up', kind: 'buff', tgt: 'self', anim: 'cast', apply: [['strength', 2, 'self']] },
  },
  ai: cycle('fireball', 'hammer', 'volley', 'psych'),
};

const bobulk: EnemyDef = {
  id: 'bobulk', name: 'Bob-ulk', sprite: 'bobomb', tint: 'grayscale(1) invert(0.85) brightness(1.05)', size: 1.6, hp: [56, 60], traits: ['explosive'],
  desc: 'Elite. A giant Bob-omb. At half HP its fuse lights: finish it that turn or it blows up your whole team.',
  moves: {
    slam: atk('Body Slam', 11),
    stomp: atk('Ground Pound', 6, 'all', { contact: false, anim: 'jump' }),
    brace: { name: 'Brace', kind: 'defend', tgt: 'self', block: 12, anim: 'none' },
    explode: { name: 'Mega Blast', kind: 'explode', dmg: 22, tgt: 'all', anim: 'lunge', contact: false, fx: (c, self) => explode(c, self) },
  },
  ai: (self) => {
    if (self.mem.lit) return 'explode';
    self.mem.turn = (self.mem.turn ?? -1) + 1;
    return ['slam', 'stomp', 'brace'][self.mem.turn % 3];
  },
  onHurt: (self, c) => {
    if (self.hp <= self.maxHp / 2) lightFuse(self, c);
  },
};

const koopatrol: EnemyDef = {
  id: 'koopatrol', name: 'Koopatrol', sprite: 'koopa', tint: 'grayscale(0.7) brightness(0.65) contrast(1.3)', size: 1.15, hp: [38, 42], traits: ['shelled', 'spiky'], armor: 3,
  desc: 'Spiked shell (3 armor): jumping on it hurts. Pierce or Flip it.',
  moves: {
    charge: atk('Shell Charge', 14),
    spin: atk('Spiked Spin', 6, 'random', { hits: 2 }),
    guard: { name: 'Shell Guard', kind: 'defend', tgt: 'self', block: 12, anim: 'none', apply: [['strength', 1, 'self']] },
  },
  ai: cycle('charge', 'spin', 'guard'),
};

const pickpocket: EnemyDef = {
  id: 'ninji_thief', name: 'Pickpocket Ninji', sprite: 'ninji', tint: 'sepia(1) hue-rotate(-30deg) saturate(2) brightness(0.8)', hp: [24, 28],
  desc: 'Steals cards from your draw pile. Defeat it to get them back.',
  moves: {
    pick: atk('Pickpocket', 6, 'mario', { fx: (c, self) => void c.stealCard(self) }),
    flurry: atk('Flurry', 4, 'random', { hits: 3 }),
    smoke: { name: 'Smoke Screen', kind: 'defend', tgt: 'self', block: 10, anim: 'none', apply: [['vanish', 1, 'self']] },
  },
  ai: cycle('pick', 'flurry', 'pick', 'smoke'),
};

const goombaBro = scaled(goomba, 'goomba3', 1.8, 4, { name: 'Gloomba' });

export const ENEMY_LIST: EnemyDef[] = [
  goomba, paragoomba, koopa, bobomb, bobombBlue, piranha, bubulbGreen, bubulbYellow, bubulbPink, bubulbBlue, bandit, babyBuzzar, hammerbro,
  goombaKing, buzzar, lily,
  buzzy, swooper, drybones, boo, bulletbill, clubba, albino, bigBoo, tubba, gourmet, raphael,
  scaled(bandit, 'bandit2', 1.4, 3),
  scaled(koopa, 'koopa2', 1.5, 3, { name: 'Koopa Veteran' }),
  ninji,
  { ...scaled(ninji, 'ninji_red', 1, 1), name: 'Red Ninji', sprite: 'ninji_red' },
  { ...scaled(ninji, 'ninji_blue', 1, 0), name: 'Blue Ninji', sprite: 'ninji_blue' },
  { ...scaled(ninji, 'ninji_green', 1.1, 0), name: 'Green Ninji', sprite: 'ninji_green' },
  { ...scaled(ninji, 'ninji_yellow', 0.9, 2), name: 'Yellow Ninji', sprite: 'ninji_yellow' },
  scaled(hammerbro, 'hammerbro3', 0.85, 2, { desc: 'Hammers rain down; it psyches itself up.' }),
  scaled(clubba, 'clubba3', 1.3, 4, { name: 'Clubba Brute' }),
  scaled(buzzy, 'buzzy3', 1.5, 3, { name: 'Buzzy Veteran' }),
  scaled(drybones, 'drybones3', 1.3, 3),
  scaled(albino, 'albino3', 1.15, 3),
  scaled(bigBoo, 'gustyboo3', 1.3, 3),
  scaled(bubulbBlue, 'bubulb_blue3', 1.4, 2),
  scaled(bubulbPink, 'bubulb_pink3', 1.4, 2),
  scaled(swooper, 'swooper3', 1.5, 3),
  goombaBro,
  bowser, kammy,
  thornyPiranha, cardShark, phantomBoo, fireBro, bobulk, koopatrol, pickpocket,
  marioBoss, luigiBoss,
  cheepCheep, mander, cherbil, slugger, dimentioClone, dimentio,
  scaled(mander, 'mander3', 1.5, 3, { name: 'Mander Veteran' }),
  scaled(cherbil, 'cherbil3', 1.5, 3),
  scaled(slugger, 'slugger3', 1.4, 3, { name: 'Slugger Ace' }),
  scaled(fireBro, 'firebro3', 1.2, 3),
  scaled(phantomBoo, 'boo_phantom3', 1.3, 3),
];
