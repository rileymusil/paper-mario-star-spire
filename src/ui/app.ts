import type { RunState } from '../engine/types';
import type { Combat } from '../engine/combat';
import { loadMeta, loadRun, saveMeta, saveRun, unlockForAct, type Meta } from '../engine/save';
import { newRun } from '../engine/run';
import { ACTS } from '../data/acts';
import { BADGES, ITEMS, PARTNERS } from '../data/registry';
import { clear, h } from './dom';
import { badgeTip, button, deckGrid, hideTip, itemTip, modal, tip } from './components';
import { icon, iconFit } from './sprite';
import { onResize, stage } from './stage';
import { setSfx, sfx } from './sfx';
import { renderTitle, renderStarter } from './screens/title';
import { renderMap } from './screens/map';
import { BattleView } from './screens/battle';
import { renderReward, renderBossReward } from './screens/reward';
import { renderEvent } from './screens/event';
import { renderShop } from './screens/shop';
import { renderRest } from './screens/rest';
import { renderPartnerNode } from './screens/partner';
import { renderActIntro, renderGameOver, renderVictory } from './screens/end';

export class App {
  meta: Meta = loadMeta();
  run: RunState | null = loadRun();
  battle: BattleView | null = null;
  private screenEl: HTMLElement;
  private mode: 'title' | 'starter' | 'run' = 'title';

  constructor() {
    this.screenEl = h('div.screen');
    stage().el.appendChild(this.screenEl);
    setSfx(this.meta.settings.sfx);
    onResize((changed) => {
      if (changed) this.render();
    });
    document.addEventListener('keydown', (e) => this.battle?.onKey(e));
  }

  // ---------- navigation ----------

  showTitle() {
    this.mode = 'title';
    this.render();
  }

  showStarter() {
    this.mode = 'starter';
    this.render();
  }

  startRun(starter: (typeof this.meta.starters)[number], hard: boolean) {
    this.run = newRun({ starter, hard });
    this.meta.runs++;
    saveMeta(this.meta);
    this.mode = 'run';
    this.commit();
  }

  continueRun() {
    if (!this.run) return;
    this.mode = 'run';
    this.render();
  }

  abandonRun() {
    this.run = null;
    saveRun(null);
    this.showTitle();
  }

  /** Save and redraw after a run-state change. */
  commit() {
    if (this.run) saveRun(this.run);
    this.render();
  }

  /** Called when an act's boss reward is resolved. */
  actCleared(act: number): string[] {
    const news = unlockForAct(this.meta, act);
    if (act >= ACTS.length) this.meta.wins++;
    saveMeta(this.meta);
    return news;
  }

  render() {
    hideTip();
    this.battle?.destroy();
    this.battle = null;
    for (const o of stage().el.querySelectorAll('.overlay')) o.remove();
    clear(this.screenEl);
    let view: HTMLElement;
    if (this.mode === 'starter') view = renderStarter(this);
    else if (this.mode === 'title' || !this.run) view = renderTitle(this);
    else view = this.renderRun(this.run);
    this.screenEl.appendChild(view);
  }

  private renderRun(run: RunState): HTMLElement {
    const s = run.screen;
    switch (s.kind) {
      case 'actIntro':
        return renderActIntro(this, run);
      case 'map':
        return renderMap(this, run);
      case 'battle':
        this.battle = new BattleView(this, run);
        return this.battle.el;
      case 'reward':
        return renderReward(this, run, s.reward, 'Victory!');
      case 'treasure':
        return renderReward(this, run, s.reward, 'Treasure!');
      case 'bossReward':
        return renderBossReward(this, run, s);
      case 'event':
        return renderEvent(this, run, s);
      case 'shop':
        return renderShop(this, run, s);
      case 'rest':
        return renderRest(this, run, s);
      case 'partner':
        return renderPartnerNode(this, run, s);
      case 'victory':
        return renderVictory(this, run);
      case 'gameover':
        return renderGameOver(this, run);
    }
  }

  // ---------- shared UI ----------

  /** Top bar. In battle, pass the combat for live HP and usable items. */
  hud(opts: { combat?: Combat; onItem?: (slot: number) => void; showMap?: boolean } = {}): HTMLElement {
    const run = this.run!;
    const c = opts.combat;
    const marioHp = c ? c.mario.hp : run.mario.hp;
    const items = c ? c.items : run.items;
    const node = run.current ? run.map.nodes[run.current] : run.pos ? run.map.nodes[run.pos] : null;
    const floor = node ? Math.min(node.floor, run.map.floors + 1) : 0;
    const left = h(
      'div.hud-left',
      null,
      tip(h('div.hud-stat.hp', null, icon('heart', 1.5), h('span', null, `${Math.max(0, marioHp)}/${run.mario.maxHp}`)), () => 'Mario\'s HP. If it hits 0, the run ends.'),
      ...run.partners.map((p) => {
        const live = c?.allies.find((u) => u.id === p.id);
        const hp = live ? live.hp : p.hp;
        return tip(
          h('div.hud-partner', { class: p.field ? '' : 'reserve' }, icon(PARTNERS[p.id].icon, 1), h('span', null, `${Math.max(0, hp)}`), p.rank ? h('span.rank', null, p.rank === 1 ? 'S' : 'U') : null),
          () => `<b>${PARTNERS[p.id].name}</b> ${['', '(Super)', '(Ultra)'][p.rank]}<br>HP ${Math.max(0, hp)}/${p.maxHp}${p.field ? '' : '<br><i>In reserve</i>'}`,
        );
      }),
      tip(h('div.hud-stat', null, icon('coin', 1), h('span', null, String(run.coins - (c?.stolen ?? 0)))), () => 'Coins'),
      run.superBlocks ? tip(h('div.hud-stat', null, iconFit('i_superblock', 20), h('span', null, String(run.superBlocks))), () => 'Super Blocks: spend at a rest site to rank up a partner.') : null,
    );
    const itemRow = h(
      'div.hud-items',
      null,
      ...items.map((id, slot) =>
        id
          ? tip(h('div.item-slot', { class: opts.onItem ? 'usable' : undefined, onclick: () => opts.onItem?.(slot) }, iconFit(ITEMS[id].icon, 26)), () => itemTip(id) + (opts.onItem ? '<br><i>Tap to use</i>' : ''))
          : h('div.item-slot.empty'),
      ),
    );
    const badges = h(
      'div.hud-badges',
      null,
      ...run.badges.map((b) => tip(h('div.badge', null, iconFit(BADGES[b].icon, 22)), () => badgeTip(b))),
    );
    const right = h(
      'div.hud-right',
      null,
      h('div.hud-floor', null, `Act ${run.act}`, h('small', null, floor ? ` · Floor ${floor > run.map.floors ? 'Boss' : floor}` : '')),
      button(h('span', null, 'Deck ', h('b', null, String(run.deck.length))), () => this.openDeck(), 'small'),
      opts.showMap ? button('Map', () => this.openMap(), 'small') : null,
      button('⚙', () => this.openSettings(), 'small gear'),
    );
    return h('div.hud', null, left, itemRow, badges, right);
  }

  openDeck() {
    const run = this.run!;
    modal(`Deck (${run.deck.length})`, deckGrid(run, run.deck), { wide: true });
  }

  openMap() {
    const run = this.run!;
    const m = modal(`${ACTS[run.act - 1].name}`, renderMap(this, run, true), { wide: true });
    m.el.classList.add('mapmodal');
  }

  openSettings() {
    const st = this.meta.settings;
    const row = (label: string, opts: [string, string][], val: string, set: (v: string) => void) =>
      h(
        'div.setting',
        null,
        h('div.setting-label', null, label),
        h(
          'div.seg',
          null,
          ...opts.map(([v, l]) =>
            button(l, () => {
              set(v);
              saveMeta(this.meta);
              sfx.select();
              m.close();
              this.openSettings();
            }, v === val ? 'on' : ''),
          ),
        ),
      );
    const body = h(
      'div.settings',
      null,
      row('Action Commands', [['on', 'Timed'], ['auto', 'Always Nice'], ['off', 'Off']], st.commands, (v) => (st.commands = v as any)),
      h('p.hint', null, 'Timed: press Space / click / tap when the ring closes for bonus damage, and right before an enemy hits to Guard.'),
      row('Battle speed', [['1', 'Normal'], ['2', 'Fast']], String(st.speed), (v) => (st.speed = Number(v) as 1 | 2)),
      row('Sound', [['1', 'On'], ['0', 'Off']], st.sfx ? '1' : '0', (v) => {
        st.sfx = v === '1';
        setSfx(st.sfx);
      }),
      this.run && this.mode === 'run'
        ? h(
            'div.danger',
            null,
            button('Save & quit to title', () => {
              m.close();
              this.showTitle();
            }),
            button('Abandon run', () => {
              if (confirm('Abandon this run? It cannot be resumed.')) {
                m.close();
                this.abandonRun();
              }
            }, 'red'),
          )
        : null,
    );
    const m = modal('Settings', body);
  }
}
