import type { App } from '../app';
import type { RunState, ScreenState } from '../../engine/types';
import { EVENTS } from '../../data/events';
import { canDuplicate, canRemove, canUpgrade, completeNode, duplicateCard, removeCard, transformCard, upgradeCard, withRng } from '../../engine/run';
import { h, sleep } from '../dom';
import { button } from '../components';
import { icon } from '../sprite';
import { sfx } from '../sfx';
import { npcBox, pickCards, rewardRows } from './common';

export function renderEvent(app: App, run: RunState, s: Extract<ScreenState, { kind: 'event' }>): HTMLElement {
  const ev = EVENTS[s.event];
  const page = ev.pages[s.step](run, s.data);
  const go = (next: string) => {
    if (next === 'end') completeNode(run);
    else s.step = next;
    app.commit();
  };
  const body = h('div.event-text', null, page.text);
  const actions: (HTMLElement | null)[] = page.options.map((o) =>
    h(
      'button.btn.event-opt',
      {
        class: o.disabled ? 'disabled' : '',
        onclick: () => {
          if (o.disabled) return sfx.error();
          sfx.select();
          go(withRng(run, 'events', (r) => o.go(run, s.data, r)));
        },
      },
      h('span.opt-label', null, o.label),
      o.detail || o.disabled ? h('span.opt-detail', null, o.disabled ? `(${o.disabled})` : o.detail!) : null,
    ),
  );
  if (page.pick) {
    const pk = page.pick;
    const filter = pk.kind === 'upgrade' ? (c: any) => canUpgrade(run, c) : pk.kind === 'duplicate' ? (c: any) => canDuplicate(run, c) : (c: any) => canRemove(run, c);
    const label =
      pk.kind === 'remove'
        ? 'Choose a card to remove'
        : pk.kind === 'upgrade'
          ? `Choose ${pk.count > 1 ? `${pk.count} cards` : 'a card'} to upgrade`
          : pk.kind === 'duplicate'
            ? 'Choose a card to duplicate'
            : `Choose ${pk.count} cards to transform`;
    actions.push(
      button(label, () =>
        pickCards(run, label, pk.count, filter, (cards) => {
          for (const c of cards) {
            if (pk.kind === 'remove') removeCard(run, c.uid);
            else if (pk.kind === 'upgrade') upgradeCard(run, c.uid);
            else if (pk.kind === 'duplicate') duplicateCard(run, c.uid);
            else withRng(run, 'events', (r) => transformCard(run, c.uid, r));
          }
          sfx.star();
          go(pk.then);
        }),
      'primary'),
    );
  }
  if (page.minigame) {
    const mg = page.minigame;
    actions.push(
      button('Start', () => {
        void minigame(mg.rounds).then((hits) => {
          s.data.hits = hits;
          go(mg.then);
        });
      }, 'primary'),
    );
  }
  return h(
    'div.event-screen',
    null,
    app.hud(),
    h(
      'div.event-body',
      null,
      npcBox(ev.npc, 190, ev.npcIcon),
      h('div.panel.event-panel', null, h('div.panel-title', null, ev.title), body, page.reward ? rewardRows(app, run, page.reward) : null, h('div.event-opts', null, ...actions)),
    ),
  );
}

/** Timing minigame: a ring closes `rounds` times; returns how many presses were on time. */
async function minigame(rounds: number): Promise<number> {
  const stageEl = document.getElementById('stage')!;
  const ov = h('div.overlay.minigame');
  const counter = h('div.mg-count', null, '');
  const ring = h('div.cmd-ring.big', null, h('div.cmd-target'), h('div.cmd-shrink'), h('div.cmd-hint', null, 'Press!'));
  ov.append(h('div.mg-title', null, 'Space / Click / Tap when the ring closes!'), ring, counter);
  stageEl.appendChild(ov);
  let hits = 0;
  for (let i = 0; i < rounds; i++) {
    counter.textContent = `${i + 1} / ${rounds}`;
    const dur = 900 - i * 120;
    const shrink = ring.querySelector('.cmd-shrink') as HTMLElement;
    ring.classList.remove('hit', 'missed');
    shrink.style.animation = 'none';
    void shrink.offsetWidth;
    shrink.style.animation = `cmdshrink ${dur}ms linear forwards`;
    const t0 = performance.now();
    const ok = await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        window.removeEventListener('keydown', key);
        ov.removeEventListener('pointerdown', press);
        resolve(v);
      };
      const check = () => {
        const dt = performance.now() - t0 - dur;
        finish(dt >= -140 && dt <= 100);
      };
      const key = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          check();
        }
      };
      const press = () => check();
      window.addEventListener('keydown', key);
      ov.addEventListener('pointerdown', press);
      setTimeout(() => finish(false), dur + 120);
    });
    if (ok) {
      hits++;
      sfx.nice();
      ring.classList.add('hit');
      const n = h('div.nicepop.center', null, icon('w_nice', 3));
      ov.appendChild(n);
      setTimeout(() => n.remove(), 700);
    } else {
      sfx.miss();
      ring.classList.add('missed');
    }
    await sleep(700);
  }
  ov.remove();
  return hits;
}
