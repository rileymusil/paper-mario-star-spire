import type { App } from '../app';
import { PERKS } from '../../data/town';
import { saveMeta } from '../../engine/save';
import { h } from '../dom';
import { button } from '../components';
import { iconFit } from '../sprite';
import { sfx } from '../sfx';

/** Toad Town: spend Star Pieces from past runs on permanent perks. */
export function renderTown(app: App): HTMLElement {
  const m = app.meta;
  const rows = PERKS.map((p) => {
    const lvl = m.perks[p.id] ?? 0;
    const max = p.costs.length;
    const cost = p.costs[lvl];
    const can = lvl < max && m.starPieces >= cost;
    return h(
      'div.perk',
      { class: lvl >= max ? 'maxed' : can ? 'buyable' : '' },
      h('div.perk-icon', null, iconFit(p.icon, 40)),
      h(
        'div.perk-body',
        null,
        h('b', null, p.name),
        h('small.perk-who', null, p.who),
        h('div.perk-desc', null, p.desc(Math.max(1, lvl))),
        lvl > 0 && lvl < max ? h('small.perk-next', null, `Next: ${p.desc(lvl + 1)}`) : null,
        max > 1 ? h('div.perk-pips', null, ...Array.from({ length: max }, (_, i) => h('span', { class: i < lvl ? 'on' : '' }))) : null,
      ),
      lvl >= max
        ? h('div.perk-owned', null, 'Owned')
        : button(h('span', null, iconFit('i_starpiece', 18), ` ${cost}`), () => {
            if (!can) return sfx.error();
            m.starPieces -= cost;
            m.perks[p.id] = lvl + 1;
            saveMeta(m);
            sfx.star();
            app.showTown();
          }, can ? 'primary' : 'disabled'),
    );
  });
  return h(
    'div.town-screen',
    null,
    h('div.title-bg.dim', { style: { backgroundImage: 'url(bg/hills.png)' } }),
    h('div.screen-title', null, 'Toad Town'),
    h('div.town-bank', null, iconFit('i_starpiece', 28), h('b', null, String(m.starPieces)), ' Star Pieces'),
    h('div.town-hint', null, 'Earn Star Pieces by clearing acts, elites and bosses. Perks apply to every new run.'),
    h('div.perk-list', null, ...rows),
    h('div.starter-actions', null, button('Back', () => app.showTitle())),
  );
}
