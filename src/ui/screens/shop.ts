import type { App } from '../app';
import type { RunState, ScreenState } from '../../engine/types';
import { ACTS } from '../../data/acts';
import { BADGES, ITEMS } from '../../data/registry';
import { addBadge, addCard, addItem, canRemove, completeNode, removeCard, spend } from '../../engine/run';
import { h } from '../dom';
import { badgeTip, button, cardEl, coinLabel, itemTip, tip } from '../components';
import { iconFit } from '../sprite';
import { sfx } from '../sfx';
import { npcBox, pickCards } from './common';

const LINES = ['Welcome, welcome! Take a look!', 'Best prices in the Mushroom Kingdom!', 'Coins for cards, cards for coins!'];

export function renderShop(app: App, run: RunState, s: Extract<ScreenState, { kind: 'shop' }>): HTMLElement {
  const st = s.stock;
  const buy = (price: number, give: () => boolean | void, mark: () => void) => {
    if (run.coins < price) {
      sfx.error();
      return;
    }
    if (give() === false) {
      sfx.error();
      return;
    }
    spend(run, price);
    mark();
    sfx.coin();
    app.commit();
  };
  const priceTag = (p: number) => h('div.price', { class: run.coins < p ? 'poor' : '' }, coinLabel(p));
  const cards = st.cards.map((c) =>
    h(
      'div.shop-item',
      { class: c.sold ? 'sold' : '' },
      cardEl({ id: c.id, up: false }, { onclick: () => !c.sold && buy(c.price, () => void addCard(run, c.id), () => (c.sold = true)) }),
      c.sold ? h('div.soldtag', null, 'SOLD') : priceTag(c.price),
    ),
  );
  const items = st.items.map((it) =>
    tip(
      h(
        'div.shop-item.small',
        { class: it.sold ? 'sold' : '', onclick: () => !it.sold && buy(it.price, () => addItem(run, it.id), () => (it.sold = true)) },
        iconFit(ITEMS[it.id].icon, 48),
        h('div.si-name', null, ITEMS[it.id].name),
        it.sold ? h('div.soldtag', null, 'SOLD') : priceTag(it.price),
      ),
      () => itemTip(it.id) + (run.items.includes(null) ? '' : '<br><i>Your bag is full</i>'),
    ),
  );
  const badges = st.badges.map((b) =>
    tip(
      h(
        'div.shop-item.small',
        { class: b.sold ? 'sold' : '', onclick: () => !b.sold && buy(b.price, () => addBadge(run, b.id), () => (b.sold = true)) },
        iconFit(BADGES[b.id].icon, 48),
        h('div.si-name', null, BADGES[b.id].name),
        b.sold ? h('div.soldtag', null, 'SOLD') : priceTag(b.price),
      ),
      () => badgeTip(b.id),
    ),
  );
  const sb = st.superBlock;
  const extras = [
    sb
      ? tip(
          h(
            'div.shop-item.small',
            { class: sb.sold ? 'sold' : '', onclick: () => !sb.sold && buy(sb.price, () => void (run.superBlocks += 1), () => (sb.sold = true)) },
            iconFit('i_superblock', 48),
            h('div.si-name', null, 'Super Block'),
            sb.sold ? h('div.soldtag', null, 'SOLD') : priceTag(sb.price),
          ),
          () => 'Spend at a rest site to rank up a partner.',
        )
      : null,
    tip(
      h(
        'div.shop-item.small',
        {
          class: st.removeUsed ? 'sold' : '',
          onclick: () => {
            if (st.removeUsed) return;
            if (run.coins < run.removeCost) return sfx.error();
            pickCards(run, 'Remove a card', 1, (c) => canRemove(run, c), ([c]) => {
              if (!c) return;
              spend(run, run.removeCost);
              removeCard(run, c.uid);
              run.removeCost += 25;
              st.removeUsed = true;
              sfx.coin();
              app.commit();
            });
          },
        },
        iconFit('x', 40),
        h('div.si-name', null, 'Card removal'),
        st.removeUsed ? h('div.soldtag', null, 'SOLD') : priceTag(run.removeCost),
      ),
      () => "Remove one of Mario's cards from your deck. Partner cards can't be removed.",
    ),
  ];
  const keeper = ACTS[run.act - 1].shopkeeper;
  return h(
    'div.shop-screen',
    null,
    app.hud(),
    h(
      'div.shop-body',
      null,
      h('div.shop-keeper', null, npcBox(keeper, 150), h('div.speech', null, LINES[run.act - 1] ?? LINES[0])),
      h(
        'div.panel.shop-panel',
        null,
        h('div.panel-title', null, 'Shop'),
        h('div.shop-cards', null, ...cards),
        h('div.shop-row', null, ...items, ...badges, ...extras),
        button('Leave', () => {
          completeNode(run);
          app.commit();
        }, 'big'),
      ),
    ),
  );
}
