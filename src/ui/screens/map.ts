import type { App } from '../app';
import type { MapNode, NodeType, RunState } from '../../engine/types';
import { reachable, MAP_COLS } from '../../engine/map';
import { enterNode } from '../../engine/run';
import { ACTS } from '../../data/acts';
import { ENEMIES } from '../../data/registry';
import { h } from '../dom';
import { tip } from '../components';
import { iconFit, portrait } from '../sprite';
import { stage } from '../stage';
import { sfx } from '../sfx';

const NODE_INFO: Record<NodeType, { label: string; desc: string; icon?: string; char?: string }> = {
  battle: { label: 'Battle', desc: 'Fight a group of enemies.', char: 'goomba' },
  elite: { label: 'Elite', desc: 'A tough fight. Drops a Badge.', char: 'hammerbro' },
  event: { label: 'Event', desc: 'Something unexpected...', icon: 'quiz' },
  shop: { label: 'Shop', desc: 'Spend coins on cards, items and badges.', icon: 'coin' },
  rest: { label: 'Rest', desc: 'Heal or upgrade a card. Use Super Blocks.', icon: 'heart' },
  treasure: { label: 'Treasure', desc: 'A chest with a Badge and coins.', icon: 'i_chest' },
  partner: { label: 'Partner', desc: 'Meet a new partner who wants to join.', icon: 'starIcon' },
  boss: { label: 'Boss', desc: 'The act boss.' },
};

export function renderMap(app: App, run: RunState, readOnly = false): HTMLElement {
  const port = stage().orient === 'port';
  const act = ACTS[run.act - 1];
  const map = run.map;
  const colW = port ? 92 : 96;
  const rowH = port ? 100 : 92;
  const padX = 50;
  const width = padX * 2 + (MAP_COLS - 1) * colW;
  const height = (map.floors + 1) * rowH + 140;
  const pos = (n: MapNode) =>
    n.type === 'boss'
      ? { x: width / 2, y: 80 }
      : { x: padX + n.col * colW + n.jx * colW * 0.35, y: height - 60 - (n.floor - 1) * rowH + n.jy * rowH * 0.25 };
  const next = new Set(readOnly ? [] : reachable(map, run.pos));
  const visited = new Set(run.visited);

  // edges
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.classList.add('map-lines');
  for (const n of Object.values(map.nodes)) {
    for (const k of n.next) {
      const a = pos(n);
      const b = pos(map.nodes[k]);
      const line = document.createElementNS(ns, 'line');
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const trim = 30;
      line.setAttribute('x1', String(a.x + (dx / len) * trim));
      line.setAttribute('y1', String(a.y + (dy / len) * trim));
      line.setAttribute('x2', String(b.x - (dx / len) * (k === 'boss' ? 70 : trim)));
      line.setAttribute('y2', String(b.y - (dy / len) * (k === 'boss' ? 70 : trim)));
      const walked = visited.has(n.id) && visited.has(k);
      line.setAttribute('class', walked ? 'walked' : run.pos === n.id && next.has(k) ? 'open' : '');
      svg.appendChild(line);
    }
  }

  const nodes = Object.values(map.nodes).map((n) => {
    const p = pos(n);
    const info = NODE_INFO[n.type];
    const isBoss = n.type === 'boss';
    const bossId = run.bosses[run.act - 1];
    const content = isBoss ? portrait(ENEMIES[bossId].sprite, 120) : info.char ? portrait(info.char, 40) : iconFit(info.icon!, 34);
    const cls = [
      'map-node',
      `t-${n.type}`,
      visited.has(n.id) ? 'visited' : '',
      run.pos === n.id ? 'here' : '',
      next.has(n.id) ? 'next' : '',
    ].join(' ');
    const el = h('div', { class: cls, style: { left: `${p.x}px`, top: `${p.y}px` } }, content);
    tip(el, () => `<b>${isBoss ? ENEMIES[bossId].name : info.label}</b><br>${isBoss ? ENEMIES[bossId].desc : info.desc}`);
    if (next.has(n.id)) {
      el.addEventListener('click', () => {
        sfx.select();
        enterNode(run, n.id);
        app.commit();
      });
    }
    return el;
  });

  const canvas = h('div.map-canvas', { style: { width: `${width}px`, height: `${height}px` } }, svg, ...nodes);
  const scroller = h('div.map-scroll', null, canvas);
  // Scroll so the current position (or the start) is in view.
  requestAnimationFrame(() => {
    const here = run.pos ? map.nodes[run.pos] : null;
    const y = here ? pos(here).y : height;
    scroller.scrollTop = Math.max(0, y - scroller.clientHeight * 0.65);
  });
  if (readOnly) return h('div.map-readonly', null, scroller);

  const legend = h(
    'div.map-legend.panel',
    null,
    h('div.legend-title', null, act.subtitle),
    h('div.legend-act', null, act.name),
    ...(['battle', 'elite', 'event', 'shop', 'rest', 'treasure', 'partner'] as NodeType[]).map((t) =>
      h('div.legend-row', null, h('span.legend-ic', null, NODE_INFO[t].char ? portrait(NODE_INFO[t].char!, 24) : iconFit(NODE_INFO[t].icon!, 22)), NODE_INFO[t].label),
    ),
    h('div.legend-hint', null, next.size ? 'Pick a glowing node.' : ''),
  );
  return h('div.map-screen', { class: `act${run.act}` }, app.hud(), h('div.map-body', null, legend, scroller));
}
