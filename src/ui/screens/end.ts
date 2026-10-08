import type { App } from '../app';
import type { RunState } from '../../engine/types';
import { ACTS } from '../../data/acts';
import { ENEMIES, PARTNERS } from '../../data/registry';
import { h } from '../dom';
import { button } from '../components';
import { portrait } from '../sprite';
import { sfx } from '../sfx';

export function renderActIntro(app: App, run: RunState): HTMLElement {
  const act = ACTS[run.act - 1];
  const boss = ENEMIES[run.bosses[run.act - 1]];
  return h(
    'div.act-intro',
    { style: { backgroundImage: `url(bg/${act.backgrounds[0]}.png)` } },
    h('div.act-card.panel', null,
      h('div.act-sub', null, act.subtitle),
      h('div.act-name', null, act.name),
      h('div.act-boss', null, portrait(boss.sprite, 150), h('div', null, h('small', null, 'Boss'), h('b', null, boss.name))),
      h('div.act-team', null, portrait('mario', 80, true), ...run.partners.filter((p) => p.field).map((p) => portrait(PARTNERS[p.id].sprite, 70, true))),
      button('Begin', () => {
        sfx.select();
        run.screen = { kind: 'map' };
        app.commit();
      }, 'primary big'),
    ),
  );
}

function stats(run: RunState): HTMLElement {
  const s = run.stats;
  return h(
    'div.stats',
    null,
    h('div', null, `Reached Act ${run.act}`),
    h('div', null, `Battles won: ${s.battles} · Elites: ${s.elites} · Bosses: ${s.bosses}`),
    h('div', null, `Damage dealt: ${s.damageDealt} · Nice! hits: ${s.nice}`),
    h('div', null, `Deck: ${run.deck.length} cards · Badges: ${run.badges.length} · Coins earned: ${s.coinsEarned}`),
    h('div.seed', null, `Seed ${run.seed}${run.hard ? ' · Hard' : ''}`),
  );
}

export function renderVictory(app: App, run: RunState): HTMLElement {
  return h(
    'div.end-screen.victory',
    null,
    h('div.end-bg', { style: { backgroundImage: 'url(bg/haven2.png)' } }),
    h('div.panel.end-panel', null,
      h('div.panel-title', null, 'The Star Spire is saved!'),
      h('p', null, 'Bowser and Kammy flee in a puff of smoke. The Star Spirits shine once more.'),
      h('div.act-team', null, portrait('mario', 100, true), ...run.partners.map((p) => portrait(PARTNERS[p.id].sprite, 80, true)), portrait('peach', 100)),
      stats(run),
      button('Back to title', () => app.abandonRun(), 'primary big'),
    ),
  );
}

export function renderGameOver(app: App, run: RunState): HTMLElement {
  return h(
    'div.end-screen.gameover',
    null,
    h('div.end-bg', { style: { backgroundImage: 'url(bg/storm.png)' } }),
    h('div.panel.end-panel', null,
      h('div.panel-title', null, 'Game Over'),
      h('p', null, 'Mario fell in battle... but every run makes you stronger.'),
      stats(run),
      button('Back to title', () => app.abandonRun(), 'primary big'),
    ),
  );
}
