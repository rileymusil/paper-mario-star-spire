import type { CardInst, RunState, Unit } from '../engine/types';
import type { Combat } from '../engine/combat';
import { BADGES, CARDS, ITEMS, PARTNERS, STATUSES } from '../data/registry';
import { KEYWORDS } from '../data/misc';
import { isUpgraded } from '../engine/run';
import { esc, h } from './dom';
import { icon, iconFit } from './sprite';
import { stage } from './stage';

// ---------- rules text ----------

export function markup(text: string): string {
  return esc(text)
    .replace(/\{([^}]+)\}/g, '<b class="num">$1</b>')
    .replace(/\[([^\]]+)\]/g, '<span class="kw">$1</span>');
}

export function keywordsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]))].filter((k) => KEYWORDS[k]);
}

// ---------- tooltips ----------

let tipEl: HTMLDivElement | null = null;
let tipOwner: Element | null = null;

export function hideTip() {
  tipEl?.remove();
  tipEl = null;
  tipOwner = null;
}

export function showTip(target: Element, content: Node | string) {
  hideTip();
  const st = stage();
  tipEl = h('div.tooltip', null, typeof content === 'string' ? h('div', { html: content }) : content);
  st.el.appendChild(tipEl);
  tipOwner = target;
  const r = st.toLocal(target.getBoundingClientRect());
  const tw = tipEl.offsetWidth;
  const th = tipEl.offsetHeight;
  let x = r.x + r.w / 2 - tw / 2;
  let y = r.y - th - 10;
  if (y < 4) y = r.y + r.h + 10;
  x = Math.max(6, Math.min(st.w - tw - 6, x));
  y = Math.max(6, Math.min(st.h - th - 6, y));
  Object.assign(tipEl.style, { left: `${x}px`, top: `${y}px` });
}

/** Hover (mouse) or long-press (touch) tooltip. */
export function tip<T extends Element>(el: T, content: () => Node | string): T {
  let timer = 0;
  el.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType === 'mouse') showTip(el, content());
  });
  el.addEventListener('pointerleave', () => {
    if (tipOwner === el) hideTip();
    clearTimeout(timer);
  });
  el.addEventListener('pointerdown', (e) => {
    if ((e as PointerEvent).pointerType === 'mouse') return;
    clearTimeout(timer);
    timer = window.setTimeout(() => showTip(el, content()), 380);
  });
  el.addEventListener('pointerup', () => clearTimeout(timer));
  el.addEventListener('pointercancel', () => clearTimeout(timer));
  return el;
}

export function keywordBox(words: string[]): HTMLElement | null {
  if (!words.length) return null;
  return h('div.kwbox', null, ...words.map((k) => h('div', null, h('b', null, k), ': ', KEYWORDS[k])));
}

// ---------- cards ----------

export interface CardOpts {
  run?: RunState;
  combat?: Combat;
  /** force upgraded display */
  up?: boolean;
  price?: number;
  onclick?: (e: MouseEvent) => void;
  cls?: string;
}

export function cardEl(inst: Pick<CardInst, 'id' | 'up'> & Partial<CardInst>, o: CardOpts = {}): HTMLDivElement {
  const d = CARDS[inst.id];
  const up = o.up ?? (o.run ? isUpgraded(o.run, inst as CardInst) : inst.up);
  const cost = o.combat && inst.uid ? o.combat.cost(inst as CardInst) : up && d.costUp !== undefined ? d.costUp : d.cost;
  const owner = d.owner;
  const text = d.text(up) + (d.exhaust && !(up && d.exhaustUp === false) && !/Exhaust/.test(d.text(up)) ? ' Exhaust.' : '');
  const typeLabel = d.type[0].toUpperCase() + d.type.slice(1) + (d.atk ? ` · ${d.atk === 'jump' ? 'Jump' : d.atk === 'hammer' ? 'Hammer' : d.atk === 'ground' ? 'Ground' : 'Ranged'}` : '');
  const el = h(
    'div.card',
    { class: `own-${owner} type-${d.type} rar-${d.rarity}${up ? ' up' : ''}${o.cls ? ' ' + o.cls : ''}`, onclick: o.onclick },
    d.unplayable ? null : h('div.card-cost', { class: inst.free ? 'free' : undefined }, String(cost)),
    h('div.card-name', null, d.name + (up ? '+' : '')),
    h('div.card-art', null, iconFit(d.icon, 52)),
    h('div.card-type', null, typeLabel),
    h('div.card-text', null, h('div', { html: markup(text) })),
    owner !== 'mario' && owner !== 'none' ? h('div.card-owner', null, icon(PARTNERS[owner].icon, 1)) : null,
    o.price !== undefined ? h('div.price', null, icon('coin', 1), String(o.price)) : null,
  );
  tip(el, () => keywordBox(keywordsIn(d.text(up))) ?? `<b>${esc(d.name)}</b>`);
  return el;
}

// ---------- small widgets ----------

export function button(label: string | Node, onclick: () => void, cls = ''): HTMLButtonElement {
  return h('button.btn', {
    class: cls || undefined,
    onclick: (e: MouseEvent) => {
      // drop focus so Space (the action-command key) never re-presses this button
      (e.currentTarget as HTMLElement).blur();
      onclick();
    },
  }, label);
}

export function hpBar(hp: number, max: number, block = 0, cls = ''): HTMLDivElement {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return h(
    'div.hpbar',
    { class: cls || undefined },
    h('div.hpfill', { style: { width: `${pct}%` } }),
    h('div.hptext', null, `${Math.max(0, hp)}/${max}`),
    block > 0 ? h('div.blockbadge', null, String(block)) : null,
  );
}

export function statusRow(u: Unit): HTMLDivElement {
  const row = h('div.statuses');
  for (const [id, n] of Object.entries(u.st)) {
    if (!n) continue;
    const def = STATUSES[id];
    if (!def) continue;
    row.appendChild(tip(h('div.status', { class: def.debuff ? 'debuff' : 'buff' }, iconFit(def.icon, 18), h('span', null, String(n))), () => `<b>${def.name}</b><br>${esc(def.desc(n))}`));
  }
  if (u.armor > 0 && !u.st.flipped) row.appendChild(tip(h('div.status.armor', null, '⛨', h('span', null, String(u.armor))), () => `<b>Armor ${u.armor}</b><br>Each hit deals ${u.armor} less damage unless it Pierces.`));
  return row;
}

export function badgeTip(id: string): string {
  const b = BADGES[id];
  return `<b>${esc(b.name)}</b> <i class="rar">${b.rarity}</i><br>${esc(b.desc)}`;
}

export function itemTip(id: string): string {
  const d = ITEMS[id];
  return `<b>${esc(d.name)}</b><br>${esc(d.desc)}`;
}

// ---------- modal ----------

export function modal(title: string, body: Node, opts: { onClose?: () => void; wide?: boolean; noClose?: boolean } = {}): { close: () => void; el: HTMLElement } {
  const st = stage();
  const close = () => {
    overlay.remove();
    hideTip();
    opts.onClose?.();
  };
  const overlay = h(
    'div.overlay',
    { onclick: (e: MouseEvent) => e.target === overlay && !opts.noClose && close() },
    h('div.panel.modal', { class: opts.wide ? 'wide' : undefined }, h('div.modal-title', null, title), h('div.modal-body', null, body), opts.noClose ? null : button('Close', close, 'close')),
  );
  st.el.appendChild(overlay);
  return { close, el: overlay };
}

/** Grid of cards from the deck, optionally selectable. */
export function deckGrid(run: RunState, cards: CardInst[], onPick?: (c: CardInst) => void, filter?: (c: CardInst) => boolean): HTMLElement {
  const sorted = cards.slice().sort((a, b) => ownerOrder(a) - ownerOrder(b) || CARDS[a.id].name.localeCompare(CARDS[b.id].name));
  return h(
    'div.deckgrid',
    null,
    ...sorted.map((c) => {
      const ok = !filter || filter(c);
      return cardEl(c, { run, cls: ok ? (onPick ? 'pickable' : '') : 'disabled', onclick: ok && onPick ? () => onPick(c) : undefined });
    }),
  );
}

function ownerOrder(c: CardInst): number {
  const o = CARDS[c.id].owner;
  return o === 'mario' ? 0 : o === 'none' ? 9 : 1 + Object.keys(PARTNERS).indexOf(o);
}

export function coinLabel(n: number): HTMLElement {
  return h('span.coins', null, icon('coin', 1), String(n));
}
