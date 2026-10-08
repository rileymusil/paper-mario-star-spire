import type { App } from '../app';
import type { RunState, ScreenState } from '../../engine/types';
import { PARTNERS } from '../../data/registry';
import { canUpgrade, completeNode, healTeam, upgradeCard } from '../../engine/run';
import { h } from '../dom';
import { button } from '../components';
import { iconFit, portrait } from '../sprite';
import { sfx } from '../sfx';
import { partyModal, pickCards, rankUpModal } from './common';

export function renderRest(app: App, run: RunState, s: Extract<ScreenState, { kind: 'rest' }>): HTMLElement {
  const healAmt = Math.ceil(run.mario.maxHp * 0.3);
  const choice = (ic: Node, title: string, desc: string, onclick: () => void, disabled = false) =>
    h('div.rest-choice', { class: disabled ? 'disabled' : 'pickable', onclick: () => (disabled ? sfx.error() : onclick()) }, ic, h('b', null, title), h('small', null, desc));
  const main = s.used
    ? h('div.rest-done', null, 'You feel refreshed.')
    : h(
        'div.rest-choices',
        null,
        choice(iconFit('heart', 56), 'Rest', `Heal Mario ${healAmt} HP and every partner 30%. KO'd partners wake up.`, () => {
          healTeam(run, 0.3);
          s.used = true;
          sfx.heal();
          app.commit();
        }),
        choice(iconFit('hammer_b2', 56), 'Train', 'Upgrade a card.', () =>
          pickCards(run, 'Upgrade a card', 1, (c) => canUpgrade(run, c), ([c]) => {
            if (!c) return;
            upgradeCard(run, c.uid);
            s.used = true;
            sfx.star();
            app.commit();
          }),
        ),
      );
  const extras = h(
    'div.rest-extras',
    null,
    run.partners.length > 1 ? button('Change party', () => partyModal(app, run), '') : null,
    button(h('span', null, iconFit('i_superblock', 22), ` Use Super Block (${run.superBlocks})`), () => rankUpModal(app, run, false, () => run.superBlocks--), run.superBlocks > 0 && run.partners.some((p) => p.rank < 2) ? '' : 'disabled'),
  );
  const team = h(
    'div.campfire',
    null,
    ...run.partners.filter((p) => p.field).map((p) => portrait(PARTNERS[p.id].sprite, 90, true)),
    portrait('mario', 100, true),
    h('div.fire'),
  );
  return h(
    'div.rest-screen',
    null,
    app.hud(),
    h(
      'div.rest-body',
      null,
      team,
      h(
        'div.panel.rest-panel',
        null,
        h('div.panel-title', null, 'Rest Site'),
        main,
        extras,
        button(s.used ? 'Continue' : 'Leave', () => {
          completeNode(run);
          app.commit();
        }, s.used ? 'primary big' : 'big'),
      ),
    ),
  );
}
