import { h } from './dom';

export type Orientation = 'land' | 'port';

export interface Stage {
  el: HTMLDivElement;
  w: number;
  h: number;
  scale: number;
  orient: Orientation;
  /** convert a client rect to stage-local coordinates */
  toLocal(r: DOMRect): { x: number; y: number; w: number; h: number };
}

let current: Stage | null = null;
const listeners: ((orientChanged: boolean) => void)[] = [];

export function stage(): Stage {
  if (!current) throw new Error('stage not mounted');
  return current;
}

export function onResize(fn: (orientChanged: boolean) => void) {
  listeners.push(fn);
}

function orientation(): Orientation {
  return window.innerWidth / window.innerHeight < 0.9 ? 'port' : 'land';
}

export function mountStage(root: HTMLElement): Stage {
  const el = h('div.stage', { id: 'stage' });
  root.appendChild(el);
  const s: Stage = {
    el,
    w: 1280,
    h: 720,
    scale: 1,
    orient: 'land',
    toLocal(r) {
      const sr = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / s.scale, y: (r.top - sr.top) / s.scale, w: r.width / s.scale, h: r.height / s.scale };
    },
  };
  current = s;
  const fit = () => {
    const o = orientation();
    const changed = o !== s.orient;
    s.orient = o;
    s.w = o === 'land' ? 1280 : 720;
    s.h = o === 'land' ? 720 : 1280;
    s.scale = Math.min(window.innerWidth / s.w, window.innerHeight / s.h);
    el.classList.toggle('port', o === 'port');
    el.classList.toggle('land', o === 'land');
    Object.assign(el.style, { width: `${s.w}px`, height: `${s.h}px`, transform: `translate(-50%, -50%) scale(${s.scale})` });
    return changed;
  };
  fit();
  window.addEventListener('resize', () => {
    const changed = fit();
    for (const l of listeners) l(changed);
  });
  return s;
}
