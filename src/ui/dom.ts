type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, any> | null;

/** Tiny hyperscript: h('div.card.big', { onclick }, ...children). */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | `${K}.${string}` | `.${string}`, props?: Props, ...children: Child[]): HTMLElementTagNameMap[K] {
  const [tagRaw, ...classes] = sel.split('.');
  const el = document.createElement(tagRaw || 'div') as HTMLElementTagNameMap[K];
  if (classes.length) el.className = classes.join(' ');
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list') (el as any)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Escape text for innerHTML use. */
export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
