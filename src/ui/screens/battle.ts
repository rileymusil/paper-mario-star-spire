import type { App } from '../app';
import type { CEvent, Intent, RunState, Unit } from '../../engine/types';
import type { CardDef } from '../../engine/defs';
import { Combat, type HitPreview } from '../../engine/combat';
import { finishCombat, makeCombat } from '../../engine/run';
import { CARDS, ENEMIES, ITEMS, PARTNERS, SPECIALS } from '../../data/registry';
import { h, sleep } from '../dom';
import { button, cardEl, hideTip, hpBar, showTip, statusRow, tip } from '../components';
import { SpriteView, icon, iconFit } from '../sprite';
import { stage } from '../stage';
import { sfx } from '../sfx';

interface UnitView {
  uid: string;
  root: HTMLDivElement;
  mover: HTMLDivElement;
  sprite: SpriteView;
  bars: HTMLDivElement;
  intent: HTMLDivElement;
  /** damage preview for the selected card */
  preview: HTMLDivElement;
  home: { x: number; y: number };
  off: { x: number; y: number };
  anim?: Animation;
  side: 'ally' | 'enemy';
  gone?: boolean;
}

type Layout = { ground: number; allyX: number[]; allyY: number[]; enemyL: number; enemyR: number; unitScale: number; maxH: number };

const LAYOUTS: Record<'land' | 'port', Layout> = {
  land: { ground: 470, allyX: [440, 300, 168], allyY: [0, -14, 4], enemyL: 690, enemyR: 1250, unitScale: 1, maxH: 310 },
  port: { ground: 790, allyX: [262, 166, 72], allyY: [0, -70, 0], enemyL: 350, enemyR: 700, unitScale: 0.72, maxH: 330 },
};

export class BattleView {
  el: HTMLDivElement;
  c: Combat;
  private field: HTMLDivElement;
  private fx: HTMLDivElement;
  private hudSlot: HTMLDivElement;
  private handEl: HTMLDivElement;
  private controls: HTMLDivElement;
  private views = new Map<string, UnitView>();
  private selected: number | null = null;
  private pendingItem: number | null = null;
  private busy = true;
  private cmdPress: ((t: number) => void) | null = null;
  private dead = false;
  private run: RunState;
  /** Damage-preview badges for the selected card, by unit uid; rebuilt when `previewKey` changes. */
  private previews = new Map<string, HTMLElement>();
  private previewKey = '';

  constructor(
    private app: App,
    run: RunState,
  ) {
    this.run = run;
    const s = run.screen as Extract<RunState['screen'], { kind: 'battle' }>;
    this.c = makeCombat(run);
    this.field = h('div.field', { onclick: (e: MouseEvent) => e.target === this.field && this.onFieldClick() });
    this.fx = h('div.fxlayer');
    this.hudSlot = h('div.hudslot');
    this.handEl = h('div.hand');
    this.controls = h('div.controls');
    this.el = h(
      'div.battle',
      { class: `fight-${s.fight}`, onpointerdown: (e: PointerEvent) => this.onAnyPress(e) },
      h('div.battle-bg', { style: { backgroundImage: `url(bg/${s.bg}.png)` } }),
      h('div.battle-floor'),
      this.field,
      this.fx,
      this.hudSlot,
      this.controls,
      this.handEl,
    );
    for (const u of [...this.c.allies, ...this.c.enemies]) this.addView(u);
    this.layout(false);
    this.refreshAll();
    void this.intro();
  }

  destroy() {
    this.dead = true;
    hideTip();
  }

  private get speed(): number {
    return this.app.meta.settings.speed;
  }
  private ms(n: number): number {
    return n / this.speed;
  }
  private wait(n: number) {
    return sleep(this.ms(n));
  }
  /** Wait for an animation, but never longer than its duration (paused tabs freeze animation clocks). */
  private done(a: Animation, ms: number): Promise<unknown> {
    return Promise.race([a.finished.catch(() => {}), sleep(ms + 80)]);
  }
  /** A duration that stays real-time after moveTo's speed scaling (for action-command sync). */
  private raw(n: number): number {
    return n * this.speed;
  }

  // ---------- setup & layout ----------

  private addView(u: Unit): UnitView {
    const L = LAYOUTS[stage().orient];
    const def = u.side === 'enemy' ? ENEMIES[u.id] : null;
    const sprite = new SpriteView(u.sprite, L.unitScale * (def?.size ?? 1), u.side === 'ally');
    // Keep big bosses below the HUD so their intent stays visible.
    const cap = L.maxH;
    if (sprite.height > cap) {
      sprite.scale *= cap / sprite.height;
      sprite.setSprite(u.sprite);
    }
    const mover = h('div.mover', null, sprite.el);
    const bars = h('div.unit-bars');
    const intent = h('div.intent');
    const preview = h('div.dmg-preview-slot');
    const root = h('div.unit', { class: `side-${u.side}`, onclick: (e: MouseEvent) => this.onUnitClick(u.uid, e) }, intent, mover, preview, bars);
    tip(root, () => this.unitInfo(u.uid));
    const v: UnitView = { uid: u.uid, root, mover, sprite, bars, intent, preview, home: { x: 0, y: 0 }, off: { x: 0, y: 0 }, side: u.side };
    this.views.set(u.uid, v);
    this.field.appendChild(root);
    return v;
  }

  /** Place units at their home spots. */
  private layout(animate: boolean) {
    const L = LAYOUTS[stage().orient];
    this.c.allies.forEach((u, i) => this.setHome(this.views.get(u.uid)!, L.allyX[i], L.ground + L.allyY[i], animate));
    // A move that summons several foes adds them all to the combat before their
    // summon events play, so skip any that don't have a view yet.
    const shown = this.c.enemies.filter((e) => {
      const v = this.views.get(e.uid);
      return v && !v.gone;
    });
    const widths = shown.map((e) => Math.max(70, this.views.get(e.uid)!.sprite.width * 0.9));
    const gap = 14;
    const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, shown.length - 1);
    const span = L.enemyR - L.enemyL;
    const squeeze = Math.min(1, span / total);
    let x = L.enemyL + (span - total * squeeze) / 2;
    shown.forEach((e, i) => {
      const w = widths[i] * squeeze;
      const depth = stage().orient === 'port' && shown.length > 2 ? (i % 2 ? -50 : 0) : 0;
      this.setHome(this.views.get(e.uid)!, x + w / 2, L.ground + depth, animate);
      x += w + gap * squeeze;
    });
  }

  private setHome(v: UnitView, x: number, y: number, animate: boolean) {
    v.home = { x, y };
    if (animate) v.root.animate([{ left: v.root.style.left, top: v.root.style.top }, { left: `${x}px`, top: `${y}px` }], { duration: this.ms(300), easing: 'ease-out' });
    v.root.style.left = `${x}px`;
    v.root.style.top = `${y}px`;
    v.root.style.zIndex = String(Math.round(y));
  }

  private async intro() {
    for (const v of this.views.values()) {
      const dir = v.side === 'ally' ? -1 : 1;
      v.mover.animate([{ transform: `translate(-50%, 0) translateX(${dir * 700}px)` }, { transform: 'translate(-50%, 0)' }], {
        duration: this.ms(550),
        easing: 'cubic-bezier(.2,.8,.3,1)',
      });
    }
    this.renderHand();
    await this.wait(600);
    this.busy = false;
    this.refreshAll();
  }

  // ---------- rendering ----------

  private refreshAll() {
    if (this.dead) return;
    this.updatePreviews();
    for (const u of [...this.c.allies, ...this.c.enemies]) this.refreshUnit(u);
    this.hudSlot.replaceChildren(this.app.hud({ combat: this.c, onItem: (slot) => this.onItem(slot), showMap: true }));
    this.renderControls();
  }

  private refreshUnit(u: Unit) {
    const v = this.views.get(u.uid);
    if (!v || v.gone) return;
    v.root.classList.toggle('dead', u.dead);
    v.root.classList.toggle('ko', u.dead && u.side === 'ally');
    const pile = u.side === 'enemy' && u.dead && u.mem.revive;
    v.bars.replaceChildren(
      u.dead && u.side === 'enemy' && !pile ? '' : hpBar(u.hp, u.maxHp, u.block, u.side),
      statusRow(u),
    );
    if (u.side === 'enemy') {
      v.intent.replaceChildren(...(u.dead ? [] : this.intentEl(u)));
      v.intent.style.bottom = `${v.sprite.height + 6}px`;
    }
    const base = this.basePose(u);
    if (v.sprite.current !== base && !['hurt', 'attack', 'hammerUp', 'hammerDown', 'jump', 'fall', 'run', 'stomp', 'victory', 'item', 'throw', 'shell'].includes(v.sprite.current)) v.sprite.play(base);
    const sel = this.selected !== null ? this.c.hand[this.selected] : null;
    const targetable =
      (sel && this.c.targetsFor(sel).some((t) => t.uid === u.uid)) || (this.pendingItem !== null && this.c.itemTargets(this.pendingItem).some((t) => t.uid === u.uid));
    v.root.classList.toggle('targetable', !!targetable);
    const badge = this.previews.get(u.uid);
    v.preview.replaceChildren(...(badge && !u.dead ? [badge] : []));
    v.preview.style.bottom = `${Math.round(v.sprite.height * 0.45)}px`;
  }

  /** Simulate the selected card against each unit it could hit and build damage badges. */
  private updatePreviews() {
    const c = this.c;
    const inst = this.selected !== null ? c.hand[this.selected] : undefined;
    const key = inst ? JSON.stringify([inst.uid, c.fp, c.star, [...c.allies, ...c.enemies].map((u) => [u.hp, u.block, u.dead, u.st, u.traits])]) : '';
    if (key === this.previewKey) return;
    this.previewKey = key;
    this.previews.clear();
    if (!inst || this.selected === null || c.whyNot(inst)) return;
    const d = CARDS[inst.id];
    if (d.target === 'ally') return;
    // In "Always Nice" mode every attack gets the bonus, so include it.
    const nice = d.type === 'attack' && this.app.meta.settings.commands === 'auto';
    const src = c.cardSource(inst);
    if (d.target === 'enemy') {
      for (const t of c.targetsFor(inst)) {
        const p = c.previewPlay(this.selected, t.uid, nice);
        if (p?.[t.uid]) this.previews.set(t.uid, this.previewBadge(p[t.uid], t.side, src && t !== src ? p[src.uid] : undefined));
      }
      return;
    }
    const p = c.previewPlay(this.selected, undefined, nice);
    for (const [uid, hit] of Object.entries(p ?? {})) {
      const u = c.unit(uid);
      if (u) this.previews.set(uid, this.previewBadge(hit, u.side));
    }
  }

  private previewBadge(hit: HitPreview, side: Unit['side'], self?: HitPreview): HTMLElement {
    const main: Node[] = hit.random
      ? [h('span.n', null, '?')]
      : hit.miss && !hit.dmg
        ? [h('span.n', null, 'MISS')]
        : [
            h('span.n', null, side === 'ally' ? `-${hit.dmg}` : String(hit.dmg)),
            hit.blocked ? h('span.blk', { title: 'Absorbed by Block' }, String(hit.blocked)) : null,
            hit.lethal ? h('span.ko', null, 'KO') : null,
          ].filter((x): x is HTMLElement => !!x);
    return h(
      'div.dmg-preview',
      { class: `side-${side}${hit.lethal && !hit.random ? ' lethal' : ''}${hit.random ? ' random' : ''}` },
      ...main,
      self && (self.dmg || self.random) ? h('span.self', null, `Ouch ${self.random ? '?' : `-${self.dmg}`}`) : null,
    );
  }

  private basePose(u: Unit): string {
    if (u.dead) return u.side === 'ally' ? 'ko' : u.mem.revive ? 'pile' : 'hurt';
    if (u.st.sleep && this.views.get(u.uid)?.sprite.has('sleep')) return 'sleep';
    if (u.st.flipped) return 'flipped';
    if (u.st.dizzy || u.st.sleep) return 'hurt';
    return u.pose;
  }

  private intentEl(u: Unit): Node[] {
    const it = u.intent;
    if (!it) return [];
    if (u.st.flipped) return [h('div.intent-box.stunned', null, iconFit('x', 18), h('span', null, 'Getting up'))];
    if (u.st.sleep) return [h('div.intent-box.stunned', null, iconFit('st_sleep', 20), h('span', null, 'Asleep'))];
    if (u.st.dizzy) return [h('div.intent-box.stunned', null, iconFit('st_dizzy', 20), h('span', null, 'Dizzy'))];
    const parts: Node[] = [];
    const kindIcon: Record<string, string> = {
      buff: 'arrowUp', debuff: 'st_poison', defend: 'block', summon: 'arrowUpBlue', heal: 'heart', sleep: 'st_sleep', escape: 'run', unknown: 'quiz', explode: 'burst100',
    };
    if (it.dmg) {
      const preview = this.previewDamage(u, it);
      parts.push(h('div.dmgstar', { class: it.kind === 'explode' ? 'boom' : '' }, h('span', null, `${preview}${it.hits && it.hits > 1 ? `×${it.hits}` : ''}`)));
      if (it.kind !== 'attack' && kindIcon[it.kind]) parts.push(iconFit(kindIcon[it.kind], 22));
    } else if (kindIcon[it.kind]) parts.push(iconFit(kindIcon[it.kind], 26));
    const move = ENEMIES[u.id].moves[it.move];
    if (move.apply?.length && it.dmg) parts.push(iconFit('st_poison', 18));
    if (it.target) parts.push(h('span.arrow', null, '→'), this.targetIcon(it.target));
    if (u.mem.countdown) parts.push(h('span.countdown', null, `in ${u.mem.countdown + 1}`));
    const box = h('div.intent-box', { class: `k-${it.kind}` }, ...parts);
    return [box, h('div.intent-name', null, it.name)];
  }

  private targetIcon(t: string): Node {
    if (t === 'all') return h('span.tgt-all', null, 'ALL');
    const u = this.c.unit(t);
    if (!u || u.uid === 'mario') return iconFit('p_mario', 22);
    return iconFit(PARTNERS[u.id as keyof typeof PARTNERS]?.icon ?? 'p_mario', 22);
  }

  private previewDamage(e: Unit, it: Intent): number {
    const t = it.target && it.target !== 'all' ? this.c.unit(it.target) : this.c.mario;
    return this.c.calc(e, t && !t.dead ? t : this.c.mario, it.dmg ?? 0, {}, true);
  }

  private unitInfo(uid: string): string {
    const u = this.c.unit(uid);
    if (!u) return '';
    if (u.side === 'ally') {
      const p = u.uid === 'mario' ? null : PARTNERS[u.id as keyof typeof PARTNERS];
      return `<b>${u.name}</b><br>HP ${Math.max(0, u.hp)}/${u.maxHp}${u.block ? ` · Block ${u.block}` : ''}${p ? `<br>${p.blurb}` : ''}${u.dead ? "<br><i>KO'd: cards can't be played</i>" : ''}`;
    }
    const def = ENEMIES[u.id];
    const traits = u.traits.filter((t) => ['flying', 'spiky', 'shelled', 'boss'].includes(t));
    const it = u.intent;
    const move = it ? def.moves[it.move] : null;
    let intentLine = '';
    if (it && move && !u.dead) {
      const tgt = it.target === 'all' ? 'everyone' : it.target ? this.c.unit(it.target)?.name : '';
      intentLine = `<br><b>Next:</b> ${it.name}${it.dmg ? ` (${this.previewDamage(u, it)}${it.hits && it.hits > 1 ? '×' + it.hits : ''} dmg)` : ''}${tgt ? ` → ${tgt}` : ''}`;
      if (move.apply?.length) intentLine += `, applies ${move.apply.map(([s, n]) => `${s} ${n}`).join(', ')}`;
    }
    return `<b>${u.name}</b> ${traits.map((t) => `<span class="trait">${t}</span>`).join(' ')}<br>HP ${Math.max(0, u.hp)}/${u.maxHp}${u.armor ? ` · Armor ${u.armor}` : ''}<br><span class="desc">${def.desc}</span>${intentLine}`;
  }

  private renderControls() {
    const c = this.c;
    const starRow = h(
      'div.stars',
      null,
      ...Array.from({ length: c.starMax }, (_, i) => h('div.starpip', { class: i < c.star ? 'full' : '' }, iconFit(i < c.star ? 'star' : 'starOutline', 22))),
    );
    const canSpecial = this.run.specials.some((id) => c.canUseSpecial(id));
    const parts: (Node | null)[] = [
      tip(h('div.fp-orb', null, iconFit('flower', 34), h('div.fp-num', null, `${c.fp}/${c.maxFp + (c.powers.battery ?? 0)}`)), () => 'Flower Points (FP): spend them to play cards. Refills every turn.'),
      tip(
        h('div.star-panel', { class: canSpecial ? 'ready' : '', onclick: () => this.openSpecials() }, starRow, h('div.star-label', null, 'Star Power')),
        () => 'Star Power: earned from Nice! timing, Guards, and each new turn. Tap to use a Star Spirit special.',
      ),
      tip(h('div.pile.draw', { onclick: () => this.showPile('Draw pile', c.drawPile, true) }, h('div.pile-card'), h('span', null, String(c.drawPile.length))), () => 'Draw pile (tap to view)'),
      tip(h('div.pile.discard', { onclick: () => this.showPile('Discard pile', c.discard) }, h('div.pile-card'), h('span', null, String(c.discard.length))), () => 'Discard pile (tap to view)'),
      c.exhaustPile.length ? tip(h('div.pile.exhaust', { onclick: () => this.showPile('Exhausted', c.exhaustPile) }, h('span', null, `${c.exhaustPile.length} exh`)), () => 'Exhausted cards (gone this battle)') : null,
      button('End Turn', () => this.endTurn(), `endturn${c.phase !== 'player' || this.busy ? ' disabled' : ''}${this.noMoves() ? ' glow' : ''}`),
    ];
    this.controls.replaceChildren(...parts.filter((p): p is Node => !!p));
  }

  private noMoves(): boolean {
    return this.c.phase === 'player' && !this.c.hand.some((x) => !this.c.whyNot(x));
  }

  private renderHand() {
    if (this.dead) return;
    const c = this.c;
    const port = stage().orient === 'port';
    const n = c.hand.length;
    const cw = port ? 136 : 150;
    const areaW = port ? 690 : 860;
    const step = n > 1 ? Math.min(cw + 8, (areaW - cw) / (n - 1)) : 0;
    const startX = (port ? 360 : 640) - ((n - 1) * step) / 2;
    const els = c.hand.map((inst, i) => {
      const reason = c.whyNot(inst);
      const el = cardEl(inst, { run: this.run, combat: c, cls: `${reason ? 'cant' : 'can'}${this.selected === i ? ' selected' : ''}` });
      const mid = (n - 1) / 2;
      const rot = (i - mid) * (port ? 2.5 : 3);
      const lift = Math.abs(i - mid) ** 2 * (port ? 2 : 2.5);
      el.style.left = `${startX + i * step}px`;
      el.style.setProperty('--rot', `${rot}deg`);
      el.style.setProperty('--lift', `${lift}px`);
      el.style.zIndex = String(10 + i);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onCardClick(i);
      });
      return el;
    });
    this.handEl.replaceChildren(...els);
    this.handEl.classList.toggle('has-selection', this.selected !== null);
  }

  private toast(text: string, color = '#fff') {
    const el = h('div.toast', { style: { color } }, text);
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ---------- input ----------

  onKey(e: KeyboardEvent) {
    if (this.dead) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') {
      if (this.cmdPress) {
        e.preventDefault();
        this.cmdPress(performance.now());
        return;
      }
    }
    if (this.busy || this.c.phase !== 'player') return;
    if (/^Digit[0-9]$/.test(e.code)) {
      const i = (Number(e.code.slice(5)) + 9) % 10;
      if (i < this.c.hand.length) this.onCardClick(i);
    } else if (e.code === 'KeyE') this.endTurn();
    else if (e.code === 'Escape') this.deselect();
    else if (e.code === 'Enter' && this.selected !== null) this.onFieldClick();
  }

  /** Action command presses: any pointer press on the battle while a command is open. */
  private onAnyPress(e: PointerEvent) {
    if (this.cmdPress) {
      e.preventDefault();
      e.stopPropagation();
      this.cmdPress(performance.now());
    }
  }

  private deselect() {
    this.selected = null;
    this.pendingItem = null;
    this.renderHand();
    this.refreshAll();
  }

  private onCardClick(i: number) {
    if (this.busy || this.c.phase !== 'player') return;
    const inst = this.c.hand[i];
    const reason = this.c.whyNot(inst);
    if (reason) {
      sfx.error();
      this.toast(reason, '#ffb0b0');
      return;
    }
    this.pendingItem = null;
    const d = CARDS[inst.id];
    if (this.selected === i) {
      if (d.target !== 'enemy' && d.target !== 'ally') void this.playCard(i, undefined);
      else this.deselect();
      return;
    }
    sfx.select();
    this.selected = i;
    // A lone valid target is picked automatically on the second tap.
    this.renderHand();
    this.refreshAll();
    if (d.target !== 'enemy' && d.target !== 'ally') this.toast('Tap again (or the field) to play');
  }

  private onFieldClick() {
    if (this.busy) return;
    if (this.selected !== null) {
      const d = CARDS[this.c.hand[this.selected].id];
      if (d.target !== 'enemy' && d.target !== 'ally') {
        void this.playCard(this.selected, undefined);
        return;
      }
      const targets = this.c.targetsFor(this.c.hand[this.selected]);
      if (targets.length === 1) {
        void this.playCard(this.selected, targets[0].uid);
        return;
      }
    }
    this.deselect();
  }

  private onUnitClick(uid: string, e: MouseEvent) {
    e.stopPropagation();
    if (this.busy) return;
    if (this.pendingItem !== null) {
      if (this.c.itemTargets(this.pendingItem).some((t) => t.uid === uid)) void this.useItem(this.pendingItem, uid);
      else this.deselect();
      return;
    }
    if (this.selected !== null) {
      const inst = this.c.hand[this.selected];
      if (this.c.targetsFor(inst).some((t) => t.uid === uid)) {
        void this.playCard(this.selected, uid);
        return;
      }
      const d = CARDS[inst.id];
      if (d.target !== 'enemy' && d.target !== 'ally') {
        void this.playCard(this.selected, undefined);
        return;
      }
      sfx.error();
      const u = this.c.unit(uid);
      if (u?.traits.includes('flying') && (d.atk === 'hammer' || d.atk === 'ground')) this.toast("Can't reach flying foes!", '#ffb0b0');
      return;
    }
    const v = this.views.get(uid);
    if (v) showTip(v.root, this.unitInfo(uid));
  }

  private onItem(slot: number) {
    if (this.busy || this.c.phase !== 'player' || !this.c.items[slot]) return;
    const d = ITEMS[this.c.items[slot]!];
    this.selected = null;
    if (d.target === 'none') {
      void this.useItem(slot, undefined);
      return;
    }
    const targets = this.c.itemTargets(slot);
    if (!targets.length) {
      sfx.error();
      this.toast(d.target === 'koPartner' ? "No KO'd partner to revive" : 'No target', '#ffb0b0');
      return;
    }
    sfx.select();
    this.pendingItem = slot;
    this.renderHand();
    this.refreshAll();
    this.toast(`Choose a target for ${d.name}`);
  }

  private openSpecials() {
    if (this.busy || this.c.phase !== 'player') return;
    const list = h(
      'div.specials',
      null,
      ...this.run.specials.map((id) => {
        const sp = SPECIALS[id];
        const ok = this.c.canUseSpecial(id);
        return h(
          'div.special',
          {
            class: ok ? 'ok' : 'no',
            onclick: () => {
              if (!ok) return sfx.error();
              pop.remove();
              void this.useSpecial(id);
            },
          },
          iconFit(sp.icon, 40),
          h('div', null, h('b', null, sp.name), h('div.cost', null, ...Array.from({ length: sp.cost }, () => iconFit('star', 14))), h('div.desc', null, sp.desc)),
        );
      }),
    );
    const pop = h('div.overlay', { onclick: (e: MouseEvent) => e.target === pop && pop.remove() }, h('div.panel.specials-panel', null, h('div.modal-title', null, 'Star Spirits'), list, button('Close', () => pop.remove(), 'close')));
    stage().el.appendChild(pop);
  }

  private showPile(title: string, cards: typeof this.c.hand, shuffle = false) {
    const list = shuffle ? cards.slice().sort((a, b) => CARDS[a.id].name.localeCompare(CARDS[b.id].name)) : cards.slice().reverse();
    const body = h('div.deckgrid', null, ...list.map((c) => cardEl(c, { run: this.run, combat: this.c })));
    const pop = h('div.overlay', { onclick: (e: MouseEvent) => e.target === pop && pop.remove() }, h('div.panel.modal.wide', null, h('div.modal-title', null, `${title} (${cards.length})`), h('div.modal-body', null, body), button('Close', () => pop.remove(), 'close')));
    stage().el.appendChild(pop);
  }

  // ---------- actions ----------

  private async playCard(idx: number, targetUid: string | undefined) {
    const c = this.c;
    const inst = c.hand[idx];
    if (!inst || c.whyNot(inst)) return;
    this.busy = true;
    this.selected = null;
    this.pendingItem = null;
    const d = CARDS[inst.id];
    const src = c.cardSource(inst)!;
    const target = targetUid ? c.unit(targetUid) : undefined;
    // fly the card out of the hand
    const cardNode = this.handEl.children[idx] as HTMLElement | undefined;
    cardNode?.classList.add('played');
    sfx.play();
    this.refreshAll();
    let nice = false;
    let travelled = false;
    if (d.type === 'attack') {
      const tgt = target ?? this.centerEnemy();
      if (tgt) {
        const r = await this.attackAnim(src, tgt, d);
        nice = r.nice;
        travelled = r.travelled;
      }
    } else {
      await this.castAnim(src, d);
    }
    if (this.dead) return;
    c.play(idx, targetUid, nice);
    if (nice) this.niceFx(target ?? this.centerEnemy() ?? c.mario);
    this.renderHand();
    await this.playEvents(c.takeEvents());
    if (travelled) await this.goHome(src);
    this.views.get(src.uid)?.sprite.play(this.basePose(src));
    this.afterAction();
  }

  private async useItem(slot: number, targetUid: string | undefined) {
    const id = this.c.items[slot];
    if (!id) return;
    this.busy = true;
    this.pendingItem = null;
    const m = this.views.get('mario')!;
    m.sprite.play('item', { loop: false });
    const pop = h('div.itempop', null, iconFit(ITEMS[id].icon, 48));
    this.placeAbove(pop, m, 40);
    this.fx.appendChild(pop);
    await this.wait(550);
    pop.remove();
    this.c.useItem(slot, targetUid);
    await this.playEvents(this.c.takeEvents());
    m.sprite.play(this.basePose(this.c.mario));
    this.afterAction();
  }

  private async useSpecial(id: string) {
    this.busy = true;
    const sp = SPECIALS[id];
    sfx.star();
    const flash = h('div.specialfx', null, iconFit(sp.icon, 120), h('div', null, sp.name));
    this.fx.appendChild(flash);
    await this.wait(900);
    flash.remove();
    this.c.useSpecial(id);
    await this.playEvents(this.c.takeEvents());
    this.afterAction();
  }

  private afterAction() {
    this.busy = false;
    this.refreshAll();
    this.renderHand();
    if (this.c.isOver()) void this.finish();
  }

  private async endTurn() {
    if (this.busy || this.c.phase !== 'player') return;
    this.busy = true;
    this.selected = null;
    this.pendingItem = null;
    const c = this.c;
    c.endTurn();
    this.handEl.classList.add('discarding');
    await this.playEvents(c.takeEvents());
    await this.wait(250);
    this.handEl.classList.remove('discarding');
    this.renderHand();
    this.refreshAll();
    if (c.isOver()) return this.finish();
    this.banner('Enemy Turn', 'enemy');
    await this.wait(500);
    while (!this.dead) {
      const step = c.enemyStep();
      await this.playEvents(c.takeEvents());
      if (!step || c.isOver()) break;
      const e = c.unit(step.uid)!;
      if (step.skip) {
        this.refreshUnit(e);
        await this.wait(350);
        continue;
      }
      const hits = c.intentHits(e);
      const move = ENEMIES[e.id].moves[e.intent!.move];
      let guarded = false;
      this.views.get(e.uid)?.root.classList.add('acting');
      if (hits) guarded = await this.enemyAttackAnim(e, move.anim ?? 'lunge', move.tgt === 'all');
      else await this.enemyCastAnim(e);
      if (this.dead) return;
      c.enemyAct(step.uid, guarded);
      if (guarded) this.guardFx();
      await this.playEvents(c.takeEvents());
      if (hits && !e.dead) await this.goHome(e);
      this.views.get(e.uid)?.root.classList.remove('acting');
      if (!e.dead) this.views.get(e.uid)?.sprite.play(this.basePose(e));
      this.refreshAll();
      if (c.isOver()) break;
      await this.wait(150);
    }
    if (this.dead) return;
    await this.playEvents(c.takeEvents());
    this.refreshAll();
    if (c.isOver()) return this.finish();
    this.banner(`Turn ${c.turn}`, 'player');
    this.renderHand();
    this.busy = false;
    this.refreshAll();
  }

  private async finish() {
    if (this.dead) return;
    this.busy = true;
    const c = this.c;
    await this.wait(300);
    if (c.result === 'win') {
      sfx.victory();
      for (const u of c.livingAllies()) {
        const v = this.views.get(u.uid)!;
        v.sprite.play(v.sprite.has('victory') ? 'victory' : 'attack');
        v.mover.animate([{ transform: 'translate(-50%,0)' }, { transform: 'translate(-50%,-40px)' }, { transform: 'translate(-50%,0)' }], { duration: 500, iterations: 2 });
      }
      this.banner('Victory!', 'win');
    } else {
      sfx.defeat();
      this.banner('Mario was defeated...', 'lose');
    }
    await sleep(1700);
    if (this.dead) return;
    finishCombat(this.run, c);
    this.app.commit();
  }

  // ---------- animation helpers ----------

  private centerEnemy(): Unit | undefined {
    const live = this.c.livingEnemies();
    return live[Math.floor((live.length - 1) / 2)];
  }

  private banner(text: string, cls: string) {
    const el = h('div.banner', { class: cls }, text);
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  /** Move a unit's sprite to an offset from its home. */
  private async moveTo(v: UnitView, x: number, y: number, ms: number, arc = 0, easing = 'ease-in-out') {
    const from = `translate(-50%, 0) translate(${v.off.x}px, ${v.off.y}px)`;
    const to = `translate(-50%, 0) translate(${x}px, ${y}px)`;
    const frames: Keyframe[] = arc
      ? [
          { transform: from },
          { transform: `translate(-50%, 0) translate(${(v.off.x + x) / 2}px, ${Math.min(v.off.y, y) - arc}px)`, offset: 0.5 },
          { transform: to },
        ]
      : [{ transform: from }, { transform: to }];
    const prev = v.anim;
    const a = v.mover.animate(frames, { duration: this.ms(ms), easing: arc ? 'linear' : easing, fill: 'forwards' });
    v.anim = a;
    prev?.cancel();
    v.off = { x, y };
    v.root.style.zIndex = '900';
    await this.done(a, this.ms(ms));
  }

  private async goHome(u: Unit) {
    const v = this.views.get(u.uid);
    if (!v || v.gone) return;
    if (v.off.x === 0 && v.off.y === 0) return;
    v.sprite.play(v.sprite.has('run') ? 'run' : this.basePose(u));
    await this.moveTo(v, 0, 0, 280, Math.abs(v.off.y) > 30 ? 60 : 0);
    v.root.style.zIndex = String(Math.round(v.home.y));
    v.sprite.play(this.basePose(u));
  }

  /** Stage point offset of `to`'s front edge relative to `from`'s home. */
  private approach(from: UnitView, to: UnitView, gap = 10): { x: number; y: number } {
    const dir = to.home.x > from.home.x ? 1 : -1;
    const tw = to.sprite.width * 0.4 + from.sprite.width * 0.35 + gap;
    return { x: to.home.x - dir * tw - from.home.x, y: to.home.y - from.home.y };
  }

  private async attackAnim(src: Unit, target: Unit, d: CardDef): Promise<{ nice: boolean; travelled: boolean }> {
    const sv = this.views.get(src.uid)!;
    const tv = this.views.get(target.uid)!;
    const style = d.anim ?? 'dash';
    const pose = (a: string) => sv.sprite.play(sv.sprite.has(a) ? a : 'attack', { loop: false });
    if (style === 'jump') {
      const p = this.approach(sv, tv, 20);
      sv.sprite.play(sv.sprite.has('run') ? 'run' : 'idle');
      await this.moveTo(sv, p.x, p.y, 320);
      sfx.jump();
      pose('jump');
      const above = { x: tv.home.x - sv.home.x, y: tv.home.y - sv.home.y - tv.sprite.height * 0.85 };
      const cmd = this.command(tv, 620);
      await this.moveTo(sv, above.x, above.y - 40, this.raw(380), 0, 'ease-out');
      pose('fall');
      await this.moveTo(sv, above.x, above.y + 10, this.raw(240), 0, 'ease-in');
      const nice = await cmd;
      pose('stomp');
      return { nice, travelled: true };
    }
    if (style === 'hammer') {
      const p = this.approach(sv, tv, 0);
      sv.sprite.play(sv.sprite.has('run') ? 'run' : 'idle');
      await this.moveTo(sv, p.x, p.y, 320);
      pose('hammerUp');
      const nice = await this.command(tv, 650);
      pose('hammerDown');
      sv.mover.animate([{ transform: `translate(-50%,0) translate(${p.x}px,${p.y}px) rotate(0)` }, { transform: `translate(-50%,0) translate(${p.x + 8}px,${p.y}px) rotate(4deg)` }], { duration: 90 });
      await this.wait(90);
      return { nice, travelled: true };
    }
    if (style === 'dash' || style === 'smack' || style === 'shell') {
      const p = this.approach(sv, tv, style === 'smack' ? 0 : 6);
      pose(style === 'shell' && sv.sprite.has('shell') ? 'shell' : 'attack');
      if (style === 'shell') sv.sprite.play('shell', { loop: true, rate: 1 });
      const cmd = this.command(tv, 560);
      await this.moveTo(sv, p.x * 0.4, p.y * 0.4, this.raw(180));
      await this.moveTo(sv, p.x, p.y, this.raw(360), 0, 'ease-in');
      const nice = await cmd;
      return { nice, travelled: true };
    }
    // ranged: throw / zap / bomb / cast — projectile flies to the target
    pose('attack');
    const proj = h('div.projectile', { class: `p-${style}` }, style === 'bomb' ? iconFit('p_bombette', 28) : style === 'zap' ? iconFit('st_static', 26) : iconFit(d.icon, 26));
    this.fx.appendChild(proj);
    const a = { x: sv.home.x, y: sv.home.y - sv.sprite.height * 0.6 };
    const b = { x: tv.home.x, y: tv.home.y - tv.sprite.height * 0.5 };
    const cmd = this.command(tv, 600);
    const anim = proj.animate(
      [
        { transform: `translate(${a.x}px, ${a.y}px) scale(.6)` },
        { transform: `translate(${(a.x + b.x) / 2}px, ${Math.min(a.y, b.y) - 90}px) scale(1)`, offset: 0.5 },
        { transform: `translate(${b.x}px, ${b.y}px) scale(1.1)` },
      ],
      { duration: 600, easing: 'linear', fill: 'forwards' },
    );
    await this.done(anim, 600);
    proj.remove();
    if (style === 'bomb') this.boom(b.x, b.y);
    const nice = await cmd;
    return { nice, travelled: false };
  }

  private async castAnim(src: Unit, d: CardDef) {
    const v = this.views.get(src.uid);
    if (!v) return;
    v.sprite.play(v.sprite.has('attack') ? 'attack' : 'idle', { loop: false });
    v.mover.animate([{ transform: 'translate(-50%,0)' }, { transform: 'translate(-50%,-24px)' }, { transform: 'translate(-50%,0)' }], { duration: this.ms(320), easing: 'ease-out' });
    const sp = h('div.sparkle', null, iconFit(d.icon, 30));
    this.placeAbove(sp, v, 10);
    this.fx.appendChild(sp);
    await this.wait(380);
    sp.remove();
  }

  private async enemyAttackAnim(e: Unit, anim: string, all: boolean): Promise<boolean> {
    const ev = this.views.get(e.uid)!;
    const tUid = e.intent?.target && e.intent.target !== 'all' ? e.intent.target : 'mario';
    const tv = this.views.get(tUid) ?? this.views.get('mario')!;
    const guardTargets = all ? [...this.views.values()].filter((v) => v.side === 'ally' && !this.c.unit(v.uid)!.dead) : [tv];
    const impact = 640;
    const cmd = this.guardCommand(guardTargets, impact);
    ev.sprite.play(ev.sprite.has('throw') && anim === 'shoot' ? 'throw' : 'attack', { loop: false });
    if (anim === 'shoot' || anim === 'cast' || all) {
      const a = { x: ev.home.x, y: ev.home.y - ev.sprite.height * 0.6 };
      const b = { x: tv.home.x, y: tv.home.y - tv.sprite.height * 0.5 };
      ev.mover.animate([{ transform: 'translate(-50%,0)' }, { transform: 'translate(-50%,0) translateX(-20px)' }, { transform: 'translate(-50%,0)' }], { duration: 300 });
      await sleep(impact - 420);
      if (!all) {
        const proj = h('div.projectile.p-enemy', null, h('div.orb'));
        this.fx.appendChild(proj);
        await this.done(proj.animate([{ transform: `translate(${a.x}px,${a.y}px)` }, { transform: `translate(${b.x}px,${b.y}px)` }], { duration: 420, easing: 'ease-in', fill: 'forwards' }), 420);
        proj.remove();
      } else {
        this.fx.appendChild(h('div.shockwave'));
        await sleep(420);
        this.fx.querySelector('.shockwave')?.remove();
      }
    } else {
      const p = this.approach(ev, tv, 0);
      // timed to the guard prompt, so these ignore battle speed
      await this.moveTo(ev, p.x * 0.15, p.y * 0.15, this.raw(220));
      await this.moveTo(ev, p.x, p.y, this.raw(impact - 220), anim === 'jump' ? 120 : 0, 'ease-in');
    }
    return cmd;
  }

  private async enemyCastAnim(e: Unit) {
    const v = this.views.get(e.uid)!;
    v.sprite.play('attack', { loop: false });
    v.root.classList.add('casting');
    await this.wait(550);
    v.root.classList.remove('casting');
  }

  private placeAbove(el: HTMLElement, v: UnitView, extra = 0) {
    el.style.left = `${v.home.x + v.off.x}px`;
    el.style.top = `${v.home.y + v.off.y - v.sprite.height - extra}px`;
  }

  private boom(x: number, y: number) {
    sfx.bigHit();
    const b = h('div.boom', { style: { left: `${x}px`, top: `${y}px` } });
    this.fx.appendChild(b);
    setTimeout(() => b.remove(), 500);
  }

  private niceFx(u: Unit) {
    const v = this.views.get(u.uid);
    if (!v) return;
    sfx.nice();
    const el = h('div.nicepop', null, icon('w_nice', 2));
    this.placeAbove(el, v, 50);
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  private guardFx() {
    sfx.guard();
    this.toast('Guard!', '#9fe3ff');
  }

  // ---------- action commands ----------

  /** Attack timing ring over the target. Resolves with success. */
  private command(target: UnitView, duration: number): Promise<boolean> {
    const mode = this.app.meta.settings.commands;
    if (mode !== 'on') return sleep(duration).then(() => mode === 'auto');
    const win = this.run.badges.includes('dodgeMaster') ? 210 : 130;
    const ring = h('div.cmd-ring', null, h('div.cmd-target'), h('div.cmd-shrink', { style: { animationDuration: `${duration}ms` } }), h('div.cmd-hint', null, 'Press!'));
    ring.style.left = `${target.home.x}px`;
    ring.style.top = `${target.home.y - target.sprite.height * 0.5}px`;
    this.fx.appendChild(ring);
    const t0 = performance.now();
    return new Promise((resolve) => {
      let done = false;
      const end = (ok: boolean) => {
        if (done) return;
        done = true;
        this.cmdPress = null;
        ring.classList.add(ok ? 'hit' : 'missed');
        setTimeout(() => ring.remove(), 250);
        resolve(ok);
      };
      this.cmdPress = (t) => {
        const dt = t - t0 - duration;
        end(dt >= -win && dt <= win * 0.7);
      };
      setTimeout(() => end(false), duration + win * 0.7 + 20);
    });
  }

  /** Guard prompt: press right before impact. */
  private guardCommand(targets: UnitView[], impact: number): Promise<boolean> {
    const mode = this.app.meta.settings.commands;
    if (mode !== 'on') return sleep(impact).then(() => mode === 'auto');
    const win = this.run.badges.includes('dodgeMaster') ? 280 : 190;
    const marks = targets.map((v) => {
      const m = h('div.guard-mark', null, icon('btnA', 1));
      this.placeAbove(m, v, 18);
      this.fx.appendChild(m);
      return m;
    });
    const t0 = performance.now();
    return new Promise((resolve) => {
      let done = false;
      const end = (ok: boolean) => {
        if (done) return;
        done = true;
        this.cmdPress = null;
        for (const m of marks) {
          m.classList.add(ok ? 'hit' : 'missed');
          setTimeout(() => m.remove(), 300);
        }
        resolve(ok);
      };
      this.cmdPress = (t) => {
        const dt = t - t0 - impact;
        end(dt >= -win && dt <= 60);
      };
      setTimeout(() => end(false), impact + 70);
    });
  }

  // ---------- event playback ----------

  private async playEvents(events: CEvent[]) {
    for (const e of events) {
      if (this.dead) return;
      await this.playEvent(e);
    }
    this.refreshAll();
  }

  private async playEvent(e: CEvent) {
    const c = this.c;
    switch (e.t) {
      case 'hit': {
        const v = this.views.get(e.target);
        const u = c.unit(e.target);
        if (!v || !u) return;
        if (e.miss) {
          sfx.miss();
          this.popText(v, 'MISS', 'miss');
          await this.wait(220);
          return;
        }
        if (e.blocked > 0) this.popText(v, String(e.blocked), 'blocked');
        if (e.dmg > 0) {
          e.dmg >= 15 ? sfx.bigHit() : sfx.hit();
          this.popText(v, String(e.dmg), u.side === 'enemy' ? 'dmg-enemy' : 'dmg-ally');
          if (!u.dead || u.side === 'ally') v.sprite.play(v.sprite.has('hurt') ? 'hurt' : 'idle', { loop: false });
          v.root.classList.remove('shake');
          void v.root.offsetWidth;
          v.root.classList.add('shake');
        } else if (!e.blocked) {
          this.popText(v, '0', 'blocked');
        } else sfx.block();
        this.refreshUnit(u);
        await this.wait(230);
        if (!u.dead) v.sprite.play(this.basePose(u));
        return;
      }
      case 'block': {
        const v = this.views.get(e.target);
        if (v) {
          sfx.block();
          this.popText(v, `+${e.n}`, 'blockgain');
        }
        this.refreshUnit(c.unit(e.target)!);
        await this.wait(120);
        return;
      }
      case 'heal': {
        const v = this.views.get(e.target);
        if (v) {
          sfx.heal();
          this.popText(v, `+${e.n}`, 'heal');
        }
        this.refreshUnit(c.unit(e.target)!);
        await this.wait(160);
        return;
      }
      case 'status':
        this.refreshUnit(c.unit(e.target)!);
        await this.wait(40);
        return;
      case 'die': {
        const v = this.views.get(e.target);
        const u = c.unit(e.target);
        if (!v || !u) return;
        sfx.ko();
        if (u.side === 'enemy') {
          v.sprite.play(v.sprite.has('hurt') ? 'hurt' : 'idle', { loop: false });
          await this.done(v.mover.animate([{ transform: 'translate(-50%,0) rotateY(0)', opacity: 1 }, { transform: 'translate(-50%,0) rotateY(90deg) translateY(-10px)', opacity: 0 }], { duration: this.ms(420), fill: 'forwards' }), this.ms(420));
          v.root.style.visibility = 'hidden';
          v.gone = true;
          this.layout(true);
        } else {
          v.sprite.play('ko');
          this.refreshUnit(u);
          this.toast(`${u.name} is KO'd!`, '#ffb0b0');
          await this.wait(350);
        }
        return;
      }
      case 'revive': {
        const v = this.views.get(e.target);
        const u = c.unit(e.target);
        if (!v || !u) return;
        if (v.gone) {
          v.gone = false;
          v.root.style.visibility = '';
          v.anim?.cancel();
          v.mover.getAnimations().forEach((a) => a.cancel());
          this.layout(true);
        }
        sfx.heal();
        this.popText(v, u.side === 'enemy' ? 'Rebuilt!' : 'Revived!', 'heal');
        v.sprite.play(this.basePose(u));
        this.refreshUnit(u);
        await this.wait(300);
        return;
      }
      case 'summon': {
        const u = c.unit(e.target);
        if (!u) return;
        const v = this.addView(u);
        sfx.summon();
        this.layout(false);
        this.refreshUnit(u);
        v.mover.animate([{ transform: 'translate(-50%, -300px)', opacity: 0 }, { transform: 'translate(-50%, 0)', opacity: 1 }], { duration: this.ms(380), easing: 'cubic-bezier(.3,1.4,.6,1)' });
        await this.wait(300);
        return;
      }
      case 'pose': {
        const v = this.views.get(e.target);
        const u = c.unit(e.target);
        if (!v || !u) return;
        if (e.sprite && e.sprite !== v.sprite.id) {
          v.sprite.setSprite(e.sprite);
          this.layout(true);
        }
        if (e.pose === 'pile' && v.gone) {
          v.gone = false;
          v.root.style.visibility = '';
        }
        v.sprite.play(this.basePose(u));
        this.refreshUnit(u);
        await this.wait(120);
        return;
      }
      case 'text': {
        const v = e.target ? this.views.get(e.target) : undefined;
        if (v) this.popText(v, e.text, 'note', e.color);
        else this.toast(e.text, e.color);
        await this.wait(260);
        return;
      }
      case 'flee': {
        const v = this.views.get(e.target);
        if (!v || v.gone) return;
        await this.done(v.mover.animate([{ transform: 'translate(-50%,0)' }, { transform: 'translate(-50%,0) translateX(700px)' }], { duration: this.ms(500), easing: 'ease-in', fill: 'forwards' }), this.ms(500));
        v.root.style.visibility = 'hidden';
        v.gone = true;
        this.layout(true);
        return;
      }
      case 'fp':
      case 'star':
        if (e.t === 'star' && e.n > 0) sfx.star();
        this.renderControls();
        return;
      case 'coins':
        if (e.n > 0) sfx.coin();
        this.refreshAll();
        return;
      case 'cards':
        this.renderHand();
        this.renderControls();
        return;
    }
  }

  private popText(v: UnitView, text: string, cls: string, color?: string) {
    const el = h('div.pop', { class: cls, style: color ? { color } : undefined }, h('span', null, text));
    this.placeAbove(el, v, 0);
    el.style.left = `${v.home.x + v.off.x + (Math.random() * 30 - 15)}px`;
    this.fx.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}
