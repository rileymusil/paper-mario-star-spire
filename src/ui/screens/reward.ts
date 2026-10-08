import type { App } from '../app';
import type { Reward, RunState, ScreenState } from '../../engine/types';
import { advanceAct, completeNode, recruit } from '../../engine/run';
import { ACTS } from '../../data/acts';
import { BADGES, PARTNERS } from '../../data/registry';
import { h } from '../dom';
import { badgeTip, button, cardEl, modal, tip } from '../components';
import { iconFit, portrait } from '../sprite';
import { sfx } from '../sfx';
import { partyModal, rankUpModal, rewardRows } from './common';

export function renderReward(app: App, run: RunState, rw: Reward, title: string): HTMLElement {
  const empty = isEmpty(rw);
  return h(
    'div.reward-screen',
    null,
    app.hud(),
    h(
      'div.panel.reward-panel',
      null,
      h('div.panel-title', null, title),
      rewardRows(app, run, rw),
      button(empty ? 'Continue' : 'Skip the rest', () => {
        completeNode(run);
        app.commit();
      }, empty ? 'primary big' : 'big'),
    ),
  );
}

function isEmpty(rw: Reward): boolean {
  return (
    (!rw.coins || !!rw.taken.coins) &&
    rw.cards.every((_, i) => rw.taken.cards[i]) &&
    rw.items.every((_, i) => rw.taken.items[i]) &&
    rw.badges.every((_, i) => rw.taken.badges[i]) &&
    (!rw.superBlocks || !!rw.taken.superBlocks)
  );
}

export function renderBossReward(app: App, run: RunState, s: Extract<ScreenState, { kind: 'bossReward' }>): HTMLElement {
  const last = run.act >= ACTS.length;
  const choiceEls = s.choices.map((ch, i) => {
    const picked = s.picked === i;
    const dim = s.picked !== undefined && !picked;
    let body: HTMLElement;
    if (ch.kind === 'partner') {
      const p = PARTNERS[ch.id];
      body = h('div.bchoice-body', null, portrait(p.sprite, 90, true), h('b', null, `${p.name} joins!`), h('small', null, p.blurb));
    } else if (ch.kind === 'rankup') {
      body = h('div.bchoice-body', null, iconFit('i_superblock', 70), h('b', null, 'Rank up a partner'), h('small', null, 'Free rank-up, no Super Block needed.'));
    } else {
      body = tip(h('div.bchoice-body', null, iconFit(BADGES[ch.id].icon, 64), h('b', null, BADGES[ch.id].name), h('small', null, BADGES[ch.id].desc)), () => badgeTip(ch.id));
    }
    return h(
      'div.bchoice',
      {
        class: picked ? 'picked' : dim ? 'dim' : 'pickable',
        onclick: () => {
          if (s.picked !== undefined) return;
          const done = () => {
            s.picked = i;
            sfx.star();
            app.commit();
          };
          if (ch.kind === 'partner') {
            recruit(run, ch.id);
            done();
            if (run.partners.filter((p) => p.field).length >= 2 && !run.partners.find((p) => p.id === ch.id)!.field) partyModal(app, run);
          } else if (ch.kind === 'rankup') {
            rankUpModal(app, run, true, () => (s.picked = i));
          } else {
            run.badges.push(ch.id);
            BADGES[ch.id].onGain?.(run);
            done();
          }
        },
      },
      body,
    );
  });
  return h(
    'div.reward-screen.boss',
    null,
    app.hud(),
    h(
      'div.panel.reward-panel',
      null,
      h('div.panel-title', null, last ? 'Bowser is defeated!' : 'Boss defeated!'),
      rewardRows(app, run, s.reward),
      h('div.bchoice-title', null, 'Star Spirit blessing: choose one'),
      h('div.bchoice-row', null, ...choiceEls),
      button(last ? 'Claim victory!' : `On to Act ${run.act + 1}`, () => {
        const news = app.actCleared(run.act);
        completeNode(run);
        advanceAct(run);
        app.commit();
        const unlockedSpecial = !last ? (run.act === 2 ? 'Star Storm' : 'Chill Out') : null;
        const lines = [...(unlockedSpecial ? [`New Star Spirit special: ${unlockedSpecial}!`] : []), ...news];
        if (lines.length) modal('Unlocked!', h('div.unlocks', null, ...lines.map((l) => h('p', null, l))));
      }, 'primary big'),
    ),
  );
}

export { cardEl };
