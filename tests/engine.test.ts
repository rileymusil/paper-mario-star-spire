import { describe, expect, it } from 'vitest';
import sprites from '../src/generated/sprites.json';
import { Combat } from '../src/engine/combat';
import { Rng } from '../src/engine/rng';
import { generateMap, reachable } from '../src/engine/map';
import { newRun } from '../src/engine/run';
import type { RunState } from '../src/engine/types';
import { ACTS, FLOORS } from '../src/data/acts';
import { CARD_LIST } from '../src/data/cards';
import { ENEMY_LIST } from '../src/data/enemies';
import { EVENT_LIST } from '../src/data/events';
import { BADGE_LIST, ITEM_LIST, SPECIAL_LIST, STATUS_LIST } from '../src/data/misc';
import { PARTNER_LIST } from '../src/data/partners';
import { CARDS, ENEMIES } from '../src/data/registry';
import { autoCombat, autoRun } from './bot';

const icons = new Set(Object.keys(sprites.icons.rects));
const chars = new Set(Object.keys(sprites.chars));

function fight(enemies: string[], tweak?: (run: RunState) => void): Combat {
  const run = newRun({ seed: 'T', starter: 'kooper' });
  tweak?.(run);
  const c = new Combat(run, enemies, 'normal', new Rng(1));
  c.begin();
  return c;
}

/** Put a specific card in hand and return its index. */
function give(c: Combat, id: string, up = false): number {
  c.hand.push({ uid: `x${c.hand.length}`, id, up });
  c.fp = 10;
  return c.hand.length - 1;
}

describe('data integrity', () => {
  it('every icon and sprite reference exists', () => {
    for (const c of CARD_LIST) expect(icons.has(c.icon), `card ${c.id} icon ${c.icon}`).toBe(true);
    for (const i of ITEM_LIST) expect(icons.has(i.icon), `item ${i.id}`).toBe(true);
    for (const b of BADGE_LIST) expect(icons.has(b.icon), `badge ${b.id}`).toBe(true);
    for (const s of SPECIAL_LIST) expect(icons.has(s.icon), `special ${s.id}`).toBe(true);
    for (const s of STATUS_LIST) expect(icons.has(s.icon), `status ${s.id}`).toBe(true);
    for (const p of PARTNER_LIST) {
      expect(chars.has(p.sprite)).toBe(true);
      expect(icons.has(p.icon)).toBe(true);
      for (const s of p.starters) expect(CARDS[s]?.owner).toBe(p.id);
    }
    for (const e of ENEMY_LIST) expect(chars.has(e.sprite), `enemy ${e.id} sprite ${e.sprite}`).toBe(true);
    for (const e of EVENT_LIST) expect(e.npcIcon ? icons.has(e.npc) : chars.has(e.npc), `event ${e.id}`).toBe(true);
    for (const a of ACTS) {
      expect(chars.has(a.shopkeeper)).toBe(true);
      for (const enc of [...a.easy, ...a.normal, ...a.elite, a.bosses, ...Object.values(a.bossParty)])
        for (const id of enc) expect(ENEMIES[id], id).toBeTruthy();
    }
  });

  it('every partner has cards at each reward rarity', () => {
    for (const p of PARTNER_LIST)
      for (const r of ['common', 'uncommon', 'rare']) expect(CARD_LIST.some((c) => c.owner === p.id && c.rarity === r), `${p.id} ${r}`).toBe(true);
  });

  it('every event page option leads to a defined page', () => {
    const run = newRun({ seed: 'E', starter: 'goombario' });
    run.coins = 999;
    for (const ev of EVENT_LIST) {
      for (const [key, page] of Object.entries(ev.pages)) {
        const p = page(run, { q: 0, order: [1, 2, 3], hits: 1, reward: undefined, got: 'x' });
        const targets = [p.pick?.then, p.minigame?.then].filter(Boolean) as string[];
        for (const t of targets) expect(ev.pages[t], `${ev.id}.${key} -> ${t}`).toBeTruthy();
      }
      expect(ev.pages.start).toBeTruthy();
    }
  });
});

describe('map', () => {
  it('is connected, has fixed floors, and ends at the boss', () => {
    for (let s = 0; s < 30; s++) {
      const m = generateMap(new Rng(s), FLOORS);
      const seen = new Set<string>();
      const stack = [...m.starts];
      while (stack.length) {
        const k = stack.pop()!;
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push(...m.nodes[k].next);
      }
      expect(seen.size).toBe(Object.keys(m.nodes).length);
      expect(seen.has('boss')).toBe(true);
      for (const n of Object.values(m.nodes)) {
        if (n.floor === 1) expect(n.type).toBe('battle');
        if (n.floor === FLOORS) expect(n.type).toBe('rest');
      }
      expect(Object.values(m.nodes).filter((n) => n.type === 'partner').length).toBe(1);
      expect(reachable(m, null)).toEqual(m.starts);
    }
  });
});

describe('combat rules', () => {
  it('hammers cannot target flying foes but jumps can, and jumps ground winged foes', () => {
    const c = fight(['paragoomba']);
    const h = give(c, 'hammer');
    expect(c.targetsFor(c.hand[h]).length).toBe(0);
    expect(c.whyNot(c.hand[h])).toMatch(/flying/i);
    const j = give(c, 'jump');
    const pg = c.enemies[0];
    expect(c.play(j, pg.uid, false)).toBe(true);
    expect(pg.traits).not.toContain('flying');
    expect(pg.sprite).toBe('goomba');
    expect(c.targetsFor(c.hand[h]).length).toBe(1);
  });

  it('jumping flips shelled foes and removes their armor', () => {
    const c = fight(['koopa']);
    const k = c.enemies[0];
    k.hp = k.maxHp = 50;
    expect(c.calc(c.mario, k, 6, { kind: 'hammer' })).toBe(4);
    c.play(give(c, 'jump'), k.uid, false);
    expect(k.st.flipped).toBe(1);
    expect(k.hp).toBe(50 - 3);
    expect(c.calc(c.mario, k, 6, { kind: 'hammer' })).toBe(6);
    c.endTurn();
    const step = c.enemyStep();
    expect(step?.skip).toBe(true);
    expect(k.st.flipped).toBeUndefined();
  });

  it('jumping on spiky foes hurts the jumper', () => {
    const c = fight(['piranha']);
    const hp = c.mario.hp;
    c.play(give(c, 'jump'), c.enemies[0].uid, false);
    expect(c.mario.hp).toBe(hp - 3);
  });

  it('Nice! timing adds damage', () => {
    const c = fight(['goomba']);
    const g = c.enemies[0];
    g.hp = g.maxHp = 50;
    c.play(give(c, 'hammer'), g.uid, true);
    expect(g.hp).toBe(50 - 8);
  });

  it('soft and shrunk modify damage', () => {
    const c = fight(['goomba']);
    const g = c.enemies[0];
    g.st.soft = 1;
    expect(c.calc(c.mario, g, 10)).toBe(15);
    c.mario.st.shrunk = 1;
    expect(c.calc(c.mario, g, 10)).toBe(10);
  });

  it("KO'd partners can't play their cards; block absorbs damage", () => {
    const c = fight(['goomba']);
    const kooper = c.allies[1];
    c.loseHp(kooper, 999);
    expect(kooper.dead).toBe(true);
    const i = give(c, 'shellToss');
    expect(c.whyNot(c.hand[i])).toMatch(/KO/);
    c.gainBlock(c.mario, 5);
    c.hit(c.enemies[0], c.mario, 8, {}, true);
    expect(c.mario.block).toBe(0);
    expect(c.mario.hp).toBe(c.mario.maxHp - 3);
  });

  it('bob-ombs light their fuse when hurt and explode', () => {
    const c = fight(['bobomb']);
    const b = c.enemies[0];
    b.hp = b.maxHp = 40;
    c.play(give(c, 'hammer'), b.uid, false);
    expect(b.intent?.move).toBe('explode');
    c.endTurn();
    const step = c.enemyStep()!;
    c.enemyAct(step.uid, false);
    expect(b.dead).toBe(true);
  });

  it('dry bones collapse and rebuild unless pierced', () => {
    const c = fight(['drybones', 'goomba']);
    const d = c.enemies[0];
    c.kill(d, {});
    expect(d.dead).toBe(true);
    expect(d.mem.revive).toBe(2);
    c.endTurn();
    while (c.phase === 'enemy') {
      const s = c.enemyStep();
      if (!s) break;
      if (!s.skip) c.enemyAct(s.uid, false);
    }
    c.endTurn();
    while (c.phase === 'enemy') {
      const s = c.enemyStep();
      if (!s) break;
      if (!s.skip) c.enemyAct(s.uid, false);
    }
    expect(d.dead).toBe(false);
    expect(d.hp).toBe(Math.ceil(d.maxHp / 2));
  });

  it('combat is won when only collapsed dry bones remain', () => {
    const c = fight(['drybones']);
    c.kill(c.enemies[0], {});
    c.checkEnd();
    expect(c.result).toBe('win');
  });

  it('partner deck cards only come from field partners', () => {
    const c = fight(['goomba'], (run) => {
      run.partners[0].field = false;
    });
    const all = [...c.drawPile, ...c.hand, ...c.discard];
    expect(all.some((x) => CARDS[x.id].owner === 'kooper')).toBe(false);
  });

  it('auto-combat finishes every encounter without errors', () => {
    for (const act of ACTS) {
      for (const enc of [...act.easy, ...act.normal, ...act.elite, ...act.bosses.map((b) => [...(act.bossParty[b] ?? []), b])]) {
        const c = fight(enc);
        autoCombat(c, new Rng(3));
        expect(c.phase, enc.join()).toBe('over');
      }
    }
  });
});

describe('full runs', () => {
  it('auto-play runs reach an end state without crashing', () => {
    const starters = ['goombario', 'kooper', 'bombette'] as const;
    const results: string[] = [];
    for (let s = 0; s < 24; s++) {
      const run = newRun({ seed: `S${s}`, starter: starters[s % 3] });
      const r = autoRun(run, s, 0.8);
      expect(r.result).not.toBe('stuck');
      results.push(`${r.result}@act${r.act}`);
    }
    console.log(results.join(' '));
  });
});
