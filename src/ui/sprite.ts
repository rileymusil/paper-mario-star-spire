import manifest from '../generated/sprites.json';
import { h } from './dom';

interface CharSheet {
  src: string;
  w: number;
  h: number;
  n: number;
  anims: Record<string, number[]>;
  scale: number;
}

const CHARS = manifest.chars as unknown as Record<string, CharSheet>;
const ICONS = manifest.icons as unknown as { src: string; w: number; h: number; rects: Record<string, [number, number, number, number]> };

export function charSheet(id: string): CharSheet {
  const c = CHARS[id];
  if (!c) throw new Error(`no sprite ${id}`);
  return c;
}

/** All image URLs, for preloading. */
export function spriteUrls(): string[] {
  return [ICONS.src, ...Object.values(CHARS).map((c) => c.src)];
}

const live = new Set<SpriteView>();
let tick = 0;
setInterval(() => {
  tick++;
  for (const v of live) {
    if (!v.el.isConnected) {
      if (v.mounted) live.delete(v);
      continue;
    }
    v.mounted = true;
    v.step(tick);
  }
}, 1000 / 12);

/** A character sprite playing named animations from its atlas strip. */
export class SpriteView {
  el: HTMLDivElement;
  inner: HTMLDivElement;
  mounted = false;
  private sheet!: CharSheet;
  private anim = 'idle';
  private frames: number[] = [0];
  private idx = 0;
  /** ticks (at 12/s) per frame */
  private rate = 3;
  private loop = true;
  private once?: () => void;
  readonly px: number;

  constructor(
    public id: string,
    public scale = 1,
    flip = false,
  ) {
    this.inner = h('div.sprite-img');
    this.el = h('div.sprite', null, this.inner);
    this.px = 1;
    this.setSprite(id);
    this.setFlip(flip);
    live.add(this);
  }

  /** Display scale = sheet's own scale * view scale. */
  get factor(): number {
    return this.sheet.scale * this.scale;
  }
  get width(): number {
    return this.sheet.w * this.factor;
  }
  get height(): number {
    return this.sheet.h * this.factor;
  }

  setSprite(id: string) {
    this.id = id;
    this.sheet = charSheet(id);
    const f = this.factor;
    Object.assign(this.inner.style, {
      width: `${this.sheet.w * f}px`,
      height: `${this.sheet.h * f}px`,
      backgroundImage: `url(${this.sheet.src})`,
      backgroundSize: `${this.sheet.w * this.sheet.n * f}px ${this.sheet.h * f}px`,
    });
    Object.assign(this.el.style, { width: `${this.sheet.w * f}px`, height: `${this.sheet.h * f}px` });
    this.play(this.anim in this.sheet.anims ? this.anim : 'idle');
  }

  setFlip(flip: boolean) {
    this.inner.style.transform = flip ? 'scaleX(-1)' : '';
  }

  has(anim: string): boolean {
    return anim in this.sheet.anims;
  }

  /** Play an animation; missing animations fall back to idle. */
  play(anim: string, opts: { loop?: boolean; rate?: number; done?: () => void } = {}) {
    const frames = this.sheet.anims[anim] ?? this.sheet.anims.idle;
    this.anim = anim in this.sheet.anims ? anim : 'idle';
    this.frames = frames;
    this.idx = 0;
    this.loop = opts.loop ?? true;
    this.rate = opts.rate ?? (this.anim === 'idle' ? 4 : 2);
    this.once = opts.done;
    this.show();
  }

  get current(): string {
    return this.anim;
  }

  step(t: number) {
    if (this.frames.length <= 1 || t % this.rate !== 0) return;
    if (this.idx + 1 >= this.frames.length) {
      if (!this.loop) {
        const d = this.once;
        this.once = undefined;
        d?.();
        return;
      }
      this.idx = 0;
    } else this.idx++;
    this.show();
  }

  private show() {
    const f = this.factor;
    this.inner.style.backgroundPosition = `${-this.frames[this.idx] * this.sheet.w * f}px 0px`;
  }
}

/** Static icon from the icon atlas. */
export function icon(name: string, scale = 2, cls = ''): HTMLSpanElement {
  const r = ICONS.rects[name];
  const el = h('span.icon', { class: cls || undefined });
  if (!r) {
    el.textContent = '?';
    return el;
  }
  const [x, y, w, hh] = r;
  Object.assign(el.style, {
    width: `${w * scale}px`,
    height: `${hh * scale}px`,
    backgroundImage: `url(${ICONS.src})`,
    backgroundSize: `${ICONS.w * scale}px ${ICONS.h * scale}px`,
    backgroundPosition: `${-x * scale}px ${-y * scale}px`,
  });
  return el;
}

export function iconSize(name: string): [number, number] {
  const r = ICONS.rects[name];
  return r ? [r[2], r[3]] : [16, 16];
}

/** Scale an icon to fit within a box. */
export function iconFit(name: string, box: number, cls = ''): HTMLSpanElement {
  const [w, hh] = iconSize(name);
  const s = Math.max(1, Math.floor((box / Math.max(w, hh)) * 2) / 2);
  return icon(name, s, cls);
}

/** A still frame of a character (first idle frame), for portraits. */
export function portrait(id: string, maxH: number, flip = false): HTMLDivElement {
  const sh = charSheet(id);
  const s = Math.min(maxH / sh.h, 4) / sh.scale;
  const v = new SpriteView(id, s, flip);
  return v.el;
}
