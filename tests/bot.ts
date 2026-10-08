import type { Combat } from '../src/engine/combat';
import type { RunState } from '../src/engine/types';
import { Rng } from '../src/engine/rng';
import { CARDS, ITEMS, SPECIALS } from '../src/data/registry';
import { EVENTS } from '../src/data/events';
import { reachable } from '../src/engine/map';
import {
  advanceAct, canDuplicate, canRemove, canUpgrade, claimBadge, claimCard, claimCoins, claimItem, claimSuperBlock, completeNode, duplicateCard, enterNode,
  finishCombat, healTeam, makeCombat, rankUp, recruit, removeCard, transformCard, upgradeCard, withRng,
} from '../src/engine/run';

/** Greedy auto-player for one combat. Returns turns taken. */
export function autoCombat(c: Combat, rng: Rng, skill = 0.7): number {
  let guard = 0;
  while (c.phase !== 'over' && guard++ < 400) {
    if (c.phase === 'player') {
      // specials when affordable
      for (const id of ['starStorm', 'refresh', 'lullaby', 'chillOutStar']) if (c.canUseSpecial(id) && rng.chance(0.5)) c.useSpecial(id);
      // items: heal when low, otherwise use offensive ones
      c.items.forEach((id, slot) => {
        if (!id || c.phase !== 'player') return;
        const d = ITEMS[id];
        const targets = c.itemTargets(slot);
        if (d.target === 'ally') {
          const low = targets.find((t) => t.hp < t.maxHp * 0.4);
          if (low) c.useItem(slot, low.uid);
        } else if (d.target === 'koPartner') {
          if (targets.length) c.useItem(slot, targets[0].uid);
        } else if (d.target === 'enemy') {
          if (targets.length) c.useItem(slot, targets[0].uid);
        } else if (c.mario.hp < c.mario.maxHp * 0.5) c.useItem(slot);
      });
      let played = true;
      while (played && c.phase === 'player') {
        played = false;
        const order = c.hand
          .map((inst, i) => ({ inst, i, d: CARDS[inst.id] }))
          .filter((x) => !c.whyNot(x.inst))
          .sort((a, b) => rank(b.d.type) - rank(a.d.type));
        for (const { inst, i } of order) {
          const targets = c.targetsFor(inst);
          const d = CARDS[inst.id];
          let t: string | undefined;
          if (d.target === 'enemy') t = targets.sort((a, b) => a.hp - b.hp)[0]?.uid;
          if (d.target === 'ally') t = targets.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.uid;
          if (c.play(i, t, rng.chance(skill))) {
            played = true;
            break;
          }
        }
      }
      if (c.phase === 'player') c.endTurn();
    }
    while (c.phase === 'enemy') {
      const step = c.enemyStep();
      if (!step) break;
      if (!step.skip) c.enemyAct(step.uid, rng.chance(skill * 0.7));
    }
    c.takeEvents();
  }
  return c.turn;
}

const rank = (t: string) => (t === 'power' ? 3 : t === 'attack' ? 2 : 1);

/** Play a whole run with simple choices. Returns how far it got. */
export function autoRun(run: RunState, seed = 1, skill = 0.7): { act: number; floor: number; result: 'win' | 'lose' | 'stuck'; log: string[] } {
  const rng = new Rng(seed);
  const log: string[] = [];
  for (let steps = 0; steps < 500; steps++) {
    const s = run.screen;
    switch (s.kind) {
      case 'actIntro':
      case 'map': {
        const next = reachable(run.map, run.pos);
        if (!next.length) return { act: run.act, floor: 0, result: 'stuck', log };
        // prefer rests when hurt, else anything
        const hurt = run.mario.hp < run.mario.maxHp * 0.5;
        const pick = (hurt && next.find((n) => run.map.nodes[n].type === 'rest')) || rng.pick(next);
        enterNode(run, pick);
        break;
      }
      case 'battle': {
        const c = makeCombat(run);
        autoCombat(c, rng, skill);
        log.push(`act${run.act} ${s.fight} [${s.enemies.join(',')}] ${c.result} turn${c.turn} hp${c.mario.hp}/${c.mario.maxHp}`);
        finishCombat(run, c);
        if (run.screen.kind === 'gameover') return { act: run.act, floor: run.map.nodes[s.node].floor, result: 'lose', log };
        break;
      }
      case 'reward':
      case 'treasure': {
        const rw = s.reward;
        claimCoins(run, rw);
        rw.cards.forEach((choice, i) => choice.length && claimCard(run, rw, i, choice[0]));
        rw.items.forEach((_, i) => claimItem(run, rw, i));
        rw.badges.forEach((_, i) => claimBadge(run, rw, i));
        claimSuperBlock(run, rw);
        completeNode(run);
        break;
      }
      case 'bossReward': {
        const rw = s.reward;
        claimCoins(run, rw);
        rw.cards.forEach((choice, i) => choice.length && claimCard(run, rw, i, choice[0]));
        const ch = s.choices[0];
        if (ch?.kind === 'partner') recruit(run, ch.id);
        if (ch?.kind === 'rankup') rankUp(run, run.partners.find((p) => p.rank < 2)!.id);
        if (ch?.kind === 'badge') run.badges.push(ch.id);
        completeNode(run);
        advanceAct(run);
        if (run.screen.kind === 'victory') return { act: 3, floor: 11, result: 'win', log };
        break;
      }
      case 'rest': {
        while (run.superBlocks > 0 && run.partners.some((p) => p.rank < 2)) {
          rankUp(run, run.partners.find((p) => p.rank < 2)!.id);
          run.superBlocks--;
        }
        if (run.mario.hp < run.mario.maxHp * 0.6) healTeam(run, 0.3);
        else {
          const c = run.deck.find((x) => canUpgrade(run, x));
          if (c) upgradeCard(run, c.uid);
        }
        completeNode(run);
        break;
      }
      case 'shop':
        completeNode(run);
        break;
      case 'partner':
        if (s.offer.length) recruit(run, s.offer[0]);
        completeNode(run);
        break;
      case 'event': {
        const ev = EVENTS[s.event];
        const page = ev.pages[s.step](run, s.data);
        if (page.pick) {
          const kind = page.pick.kind;
          const pool = run.deck.filter((x) => (kind === 'upgrade' ? canUpgrade(run, x) : kind === 'duplicate' ? canDuplicate(run, x) : canRemove(run, x)));
          for (const card of pool.slice(0, page.pick.count)) {
            if (page.pick.kind === 'remove') removeCard(run, card.uid);
            else if (page.pick.kind === 'upgrade') upgradeCard(run, card.uid);
            else if (page.pick.kind === 'duplicate') duplicateCard(run, card.uid);
            else withRng(run, 'events', (r) => transformCard(run, card.uid, r));
          }
          s.step = page.pick.then;
          break;
        }
        if (page.minigame) {
          s.data.hits = rng.int(0, page.minigame.rounds);
          s.step = page.minigame.then;
          break;
        }
        if (page.reward) {
          const rw = page.reward;
          rw.cards.forEach((choice, i) => choice.length && claimCard(run, rw, i, choice[0]));
          rw.badges.forEach((_, i) => claimBadge(run, rw, i));
        }
        const opt = page.options.find((o) => !o.disabled);
        if (!opt) throw new Error(`event ${s.event}:${s.step} has no usable option`);
        const next = withRng(run, 'events', (r) => opt.go(run, s.data, r));
        if (next === 'end') completeNode(run);
        else s.step = next;
        break;
      }
      case 'victory':
        return { act: 3, floor: 11, result: 'win', log };
      case 'gameover':
        return { act: run.act, floor: 0, result: 'lose', log };
    }
  }
  return { act: run.act, floor: -1, result: 'stuck', log };
}

export { SPECIALS };
