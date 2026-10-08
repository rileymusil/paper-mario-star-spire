import type { App } from '../app';
import type { CardInst, PartnerId, Reward, RunState } from '../../engine/types';
import { BADGES, CARDS, ITEMS, PARTNERS } from '../../data/registry';
import { RANK_NAMES } from '../../data/partners';
import { claimBadge, claimCard, claimCoins, claimItem, claimSuperBlock, parseCardId, rankUp, setField } from '../../engine/run';
import { h } from '../dom';
import { badgeTip, button, cardEl, deckGrid, itemTip, modal, tip } from '../components';
import { iconFit, portrait } from '../sprite';
import { sfx } from '../sfx';

/** Claimable reward rows (coins, card choices, items, badges, super blocks). */
export function rewardRows(app: App, run: RunState, rw: Reward): HTMLElement {
  const rows: HTMLElement[] = [];
  const row = (ic: Node, label: string, onclick: () => void, tipText?: string) => {
    const el = h('div.reward-row', { onclick }, h('span.rr-icon', null, ic), h('span', null, label));
    if (tipText) tip(el, () => tipText);
    rows.push(el);
  };
  if (rw.coins && !rw.taken.coins)
    row(iconFit('coin', 28), `${rw.coins} coins`, () => {
      sfx.coin();
      claimCoins(run, rw);
      app.commit();
    });
  rw.cards.forEach((choice, i) => {
    if (rw.taken.cards[i] || !choice.length) return;
    row(iconFit('i_book', 28), 'Add a card to your deck', () => cardChoice(app, run, choice, (card) => claimCard(run, rw, i, card), () => (rw.taken.cards[i] = true)));
  });
  rw.items.forEach((id, i) => {
    if (rw.taken.items[i]) return;
    const full = !run.items.includes(null);
    row(iconFit(ITEMS[id].icon, 28), `${ITEMS[id].name}${full ? ' (bag full)' : ''}`, () => {
      if (claimItem(run, rw, i)) {
        sfx.coin();
        app.commit();
      } else sfx.error();
    }, itemTip(id));
  });
  rw.badges.forEach((id, i) => {
    if (rw.taken.badges[i]) return;
    row(iconFit(BADGES[id].icon, 28), `Badge: ${BADGES[id].name}`, () => {
      sfx.star();
      claimBadge(run, rw, i);
      app.commit();
    }, badgeTip(id));
  });
  if (rw.superBlocks && !rw.taken.superBlocks)
    row(iconFit('i_superblock', 28), 'Super Block', () => {
      sfx.star();
      claimSuperBlock(run, rw);
      app.commit();
    }, 'Spend at a rest site to rank up a partner.');
  return h('div.reward-rows', null, ...rows);
}

export function cardChoice(app: App, _run: RunState, choice: string[], onPick: (card: string) => void, onSkip?: () => void) {
  const m = modal(
    'Choose a card',
    h(
      'div.choice',
      null,
      h(
        'div.cardrow',
        null,
        ...choice.map((s) => {
          const { id, up } = parseCardId(s);
          return cardEl({ id, up }, {
            up,
            cls: 'pickable',
            onclick: () => {
              sfx.play();
              onPick(s);
              m.close();
              app.commit();
            },
          });
        }),
      ),
      h('div.choice-hint', null, choice.some((s) => CARDS[parseCardId(s).id].owner !== 'mario') ? 'Partner cards only show up in battle while that partner is on the field.' : ''),
      onSkip
        ? button('Skip', () => {
            onSkip();
            m.close();
            app.commit();
          }, 'small')
        : null,
    ),
    { noClose: !!onSkip },
  );
}

/** Pick `count` cards from the deck matching `filter`. */
export function pickCards(run: RunState, title: string, count: number, filter: (c: CardInst) => boolean, done: (cards: CardInst[]) => void, cancellable = true) {
  const picked: CardInst[] = [];
  const m = modal(
    title,
    deckGrid(run, run.deck, (c) => {
      if (picked.includes(c)) return;
      picked.push(c);
      sfx.select();
      if (picked.length >= Math.min(count, run.deck.filter(filter).length)) {
        m.close();
        done(picked);
      }
    }, filter),
    { wide: true, noClose: !cancellable },
  );
  if (run.deck.filter(filter).length === 0) {
    m.close();
    done([]);
  }
}

/** Choose which partners fight (max 2). */
export function partyModal(app: App, run: RunState, onDone?: () => void) {
  const body = h('div.party');
  const draw = () => {
    body.replaceChildren(
      h('div.party-hint', null, 'Up to 2 partners fight beside Mario. Reserve partners sit out, and so do their cards.'),
      h(
        'div.party-grid',
        null,
        ...run.partners.map((p) =>
          h(
            'div.party-card',
            {
              class: p.field ? 'field' : 'reserve',
              onclick: () => {
                if (p.field) {
                  if (run.partners.filter((x) => x.field).length <= 1) return sfx.error();
                  setField(run, p.id, false);
                } else if (!setField(run, p.id, true)) {
                  const other = run.partners.find((x) => x.field && x.id !== p.id);
                  if (other) {
                    setField(run, other.id, false);
                    setField(run, p.id, true);
                  }
                }
                sfx.select();
                draw();
              },
            },
            portrait(PARTNERS[p.id].sprite, 70, true),
            h('div.pname', null, PARTNERS[p.id].name),
            h('div.prank', null, `${RANK_NAMES[p.rank]} · HP ${p.hp}/${p.maxHp}`),
            h('div.pstate', null, p.field ? 'Fighting' : 'Reserve'),
          ),
        ),
      ),
    );
  };
  draw();
  modal('Party', body, {
    onClose: () => {
      app.commit();
      onDone?.();
    },
  });
}

/** Spend a Super Block on a partner. */
export function rankUpModal(app: App, run: RunState, free: boolean, onDone: (id: PartnerId) => void) {
  const m = modal(
    free ? 'Rank up a partner' : 'Use a Super Block',
    h(
      'div.party-grid',
      null,
      ...run.partners.map((p) =>
        h(
          'div.party-card',
          {
            class: p.rank >= 2 ? 'maxed' : 'pickable',
            onclick: () => {
              if (p.rank >= 2) return sfx.error();
              rankUp(run, p.id);
              sfx.star();
              m.close();
              onDone(p.id);
              app.commit();
            },
          },
          portrait(PARTNERS[p.id].sprite, 70, true),
          h('div.pname', null, PARTNERS[p.id].name),
          h('div.prank', null, p.rank >= 2 ? 'Ultra (max)' : `${RANK_NAMES[p.rank]} → ${RANK_NAMES[p.rank + 1]}`),
          h('div.pstate', null, p.rank === 0 ? '+6 HP, all their cards upgraded' : p.rank === 1 ? '+6 HP, +2 Strength in battle' : ''),
        ),
      ),
    ),
    { wide: true },
  );
}

export function npcBox(sprite: string, maxH = 160, isIcon = false): HTMLElement {
  return h('div.npc', null, isIcon ? iconFit(sprite, 90) : portrait(sprite, maxH));
}
