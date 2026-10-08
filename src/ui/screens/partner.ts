import type { App } from '../app';
import type { RunState, ScreenState } from '../../engine/types';
import { PARTNERS } from '../../data/registry';
import { completeNode, recruit } from '../../engine/run';
import { h } from '../dom';
import { button, cardEl } from '../components';
import { iconFit, portrait } from '../sprite';
import { sfx } from '../sfx';
import { partyModal } from './common';

export function renderPartnerNode(app: App, run: RunState, s: Extract<ScreenState, { kind: 'partner' }>): HTMLElement {
  const leave = () => {
    completeNode(run);
    app.commit();
  };
  if (!s.offer.length) {
    return h(
      'div.partner-screen',
      null,
      app.hud(),
      h(
        'div.panel.partner-panel',
        null,
        h('div.panel-title', null, 'An empty clearing'),
        h('p', null, "Everyone you've met is already on your team! Someone left a Super Block behind, though."),
        iconFit('i_superblock', 64),
        button('Take it', () => {
          run.superBlocks++;
          sfx.star();
          leave();
        }, 'primary big'),
      ),
    );
  }
  const options = s.offer.map((id) => {
    const p = PARTNERS[id];
    return h(
      'div.recruit',
      {
        class: 'pickable',
        onclick: () => {
          recruit(run, id);
          sfx.star();
          const joined = run.partners.find((x) => x.id === id)!;
          if (!joined.field) partyModal(app, run, leave);
          else leave();
        },
      },
      h('div.recruit-sprite', null, portrait(p.sprite, 120, true)),
      h('div.recruit-name', { style: { color: p.color } }, p.name),
      h('div.recruit-hp', null, `HP ${p.hp}`),
      h('div.recruit-blurb', null, p.blurb),
      h('div.cardrow.mini', null, ...p.starters.map((c) => cardEl({ id: c, up: false }))),
    );
  });
  const full = run.partners.filter((p) => p.field).length >= 2;
  return h(
    'div.partner-screen',
    null,
    app.hud(),
    h(
      'div.panel.partner-panel',
      null,
      h('div.panel-title', null, 'Someone wants to join!'),
      h('p.hint', null, full ? 'Your field is full: you can swap who fights after recruiting.' : 'They bring their own cards into your deck.'),
      h('div.recruit-row', null, ...options),
      button('No thanks', leave, 'small'),
    ),
  );
}
