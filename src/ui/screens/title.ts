import type { App } from '../app';
import type { PartnerId } from '../../engine/types';
import { PARTNER_LIST } from '../../data/partners';
import { ACTS } from '../../data/acts';
import { CARDS } from '../../data/registry';
import { h } from '../dom';
import { button, cardEl, modal } from '../components';
import { portrait } from '../sprite';
import { sfx } from '../sfx';

export function renderTitle(app: App): HTMLElement {
  const run = app.run;
  const m = app.meta;
  return h(
    'div.title-screen',
    null,
    h('div.title-bg', { style: { backgroundImage: 'url(bg/title_art.png)' } }),
    h(
      'div.title-center',
      null,
      h('img.logo', { src: 'bg/logo.png', alt: 'Paper Mario' }),
      h('div.subtitle', null, 'STAR SPIRE'),
      h('div.tagline', null, 'A card-battling climb with your partners'),
      h(
        'div.title-buttons',
        null,
        run ? button(h('span', null, 'Continue', h('small', null, ` Act ${run.act} · ${run.deck.length} cards`)), () => app.continueRun(), 'big primary') : null,
        button('New Run', () => {
          if (run && !confirm('Start a new run? Your current run will be lost.')) return;
          sfx.select();
          app.showStarter();
        }, run ? 'big' : 'big primary'),
        button('How to Play', () => howToPlay(), 'big'),
        button('Settings', () => app.openSettings(), 'big'),
      ),
      h('div.title-stats', null, `Runs ${m.runs} · Wins ${m.wins}${m.bestAct ? ` · Best: cleared Act ${m.bestAct}` : ''}`),
    ),
    h('div.credit', null, 'Fan-made tribute. Paper Mario characters and sprites belong to Nintendo / Intelligent Systems.'),
  );
}

export function renderStarter(app: App): HTMLElement {
  let pick: PartnerId | null = null;
  let hard = false;
  const startBtn = button('Start!', () => pick && app.startRun(pick, hard), 'big primary disabled');
  const cards = PARTNER_LIST.map((p) => {
    const unlocked = app.meta.starters.includes(p.id);
    const el = h(
      'div.starter',
      { class: unlocked ? '' : 'locked' },
      h('div.starter-sprite', null, portrait(p.sprite, 110, true)),
      h('div.starter-name', { style: { color: p.color } }, unlocked ? p.name : '???'),
      unlocked ? h('div.starter-hp', null, `HP ${p.hp}`) : null,
      h('div.starter-blurb', null, unlocked ? p.blurb : unlockHint(p.id)),
    );
    if (unlocked) {
      el.addEventListener('click', () => {
        pick = p.id;
        sfx.select();
        for (const s of grid.children) s.classList.remove('picked');
        el.classList.add('picked');
        startBtn.classList.remove('disabled');
        preview.replaceChildren(...p.starters.map((id) => cardEl({ id, up: false })), ...['jump', 'hammer', 'guard'].map((id) => cardEl({ id, up: false }, { cls: 'dim' })));
      });
    }
    return el;
  });
  const grid = h('div.starter-grid', null, ...cards);
  const preview = h('div.starter-preview', null, h('div.hint', null, 'Pick a partner to see their starting cards.'));
  return h(
    'div.starter-screen',
    null,
    h('div.title-bg.dim', { style: { backgroundImage: 'url(bg/title_art.png)' } }),
    h('div.screen-title', null, 'Choose your first partner'),
    grid,
    preview,
    h(
      'div.starter-actions',
      null,
      button('Back', () => app.showTitle()),
      app.meta.hardUnlocked
        ? h('label.hardmode', null, h('input', { type: 'checkbox', onchange: (e: Event) => (hard = (e.target as HTMLInputElement).checked) }), ' Hard mode (tougher enemies)')
        : null,
      startBtn,
    ),
  );
}

function unlockHint(id: PartnerId): string {
  const map: Partial<Record<PartnerId, string>> = {
    parakarry: 'Clear Act 1 to unlock.',
    bow: 'Clear Act 2 to unlock.',
    watt: 'Win a run to unlock.',
  };
  return map[id] ?? 'Recruit during a run.';
}

function howToPlay() {
  const body = h(
    'div.howto',
    null,
    h('p', null, `Climb ${ACTS.length} acts. Each act is a branching map ending in a boss. Mario's HP carries between fights; if it reaches 0, the run is over.`),
    h('h3', null, 'Battles'),
    h('p', null, 'Each turn you get 3 FP (flower points) and draw 5 cards. Play cards by tapping them, then tapping a target. Enemies show what they plan to do next above their heads, including who they will hit.'),
    h('p', null, "Partners stand beside Mario. Their cards are in your deck, and playing one makes that partner act. Enemies can hit partners too. A KO'd partner's cards can't be played until the battle ends."),
    h('h3', null, 'Action Commands'),
    h('p', null, 'When you attack, a ring closes on the target. Press Space, click, or tap as it lines up for a Nice! bonus. When an enemy attacks, press just before the hit to Guard and take less damage. Nice! timing also fills Star Power.'),
    h('h3', null, 'Jump vs Hammer'),
    h('p', null, "Jumps reach flying foes, flip shelled foes, and knock wings off Paragoombas, but hurt on spiky foes. Hammers can't reach flying foes."),
    h('h3', null, 'Between battles'),
    h('p', null, 'Collect cards, Badges (permanent bonuses), Items, and coins. Rest sites heal or upgrade cards. Super Blocks rank up partners (Normal, Super, Ultra). Look for the star node to recruit new partners: up to 2 fight beside Mario at once.'),
    h('div.cardrow', null, cardEl({ id: 'jump', up: false }), cardEl({ id: CARDS.shellToss.id, up: false }), cardEl({ id: 'powerJump', up: true })),
  );
  modal('How to Play', body, { wide: true });
}
