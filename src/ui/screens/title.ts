import type { App } from '../app';
import type { PartnerId } from '../../engine/types';
import { PARTNER_LIST, passiveText } from '../../data/partners';
import { HERO_LIST, HEROES, heroText, showHero, type HeroDef } from '../../data/heroes';
import { ACTS } from '../../data/acts';
import { LEVELS } from '../../data/levels';
import { CARDS, PARTNERS } from '../../data/registry';
import { h } from '../dom';
import { button, cardEl, modal, tip } from '../components';
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
  const unlockedHeroes = HERO_LIST.filter((hd) => app.meta.heroes.includes(hd.id));
  // With only Mario unlocked there's nothing to choose: go straight to partners.
  let hero: HeroDef | null = unlockedHeroes.length > 1 ? null : HEROES.mario;
  let level = app.meta.maxLevel;
  const root = h('div.starter-screen');
  const draw = () => {
    showHero(hero);
    root.replaceChildren(...(hero ? partnerStep(hero) : heroStep()));
  };

  const heroStep = (): Node[] => [
    h('div.title-bg.dim', { style: { backgroundImage: 'url(bg/title_art.png)' } }),
    h('div.screen-title', null, 'Choose your hero'),
    h(
      'div.starter-grid',
      null,
      ...HERO_LIST.map((hd) => {
        const unlocked = app.meta.heroes.includes(hd.id);
        const el = h(
          'div.starter.hero',
          { class: unlocked ? '' : 'locked' },
          h('div.starter-sprite', null, portrait(hd.sprite, 110, true)),
          h('div.starter-name', { style: { color: hd.color } }, unlocked ? hd.name : '???'),
          unlocked ? h('div.starter-hp', null, `HP ${hd.hp}${hd.partnerSlots < 2 ? ' · 1 partner' : ''}`) : null,
          h('div.starter-blurb', null, unlocked ? hd.blurb : hd.unlock),
          unlocked ? h('div.passive-line', null, `${hd.passive.name}: ${hd.passive.desc}`) : null,
        );
        if (unlocked)
          el.addEventListener('click', () => {
            sfx.select();
            hero = hd;
            draw();
          });
        return el;
      }),
    ),
    h('div.starter-actions', null, button('Back', () => app.showTitle())),
  ];

  const partnerStep = (hd: HeroDef): Node[] => {
    let pick: PartnerId | null = hd.starter ?? null;
    const startBtn = button('Start!', () => pick && app.startRun(hd.id, pick, level), `big primary${pick ? '' : ' disabled'}`);
    const preview = h('div.starter-preview', null, h('div.hint', null, 'Pick a partner to see their starting cards.'));
    const heroCards = [...new Set(hd.deck)].map((id) => cardEl({ id, up: false }, { cls: 'dim' }));
    const showDeck = (p: PartnerId) => preview.replaceChildren(...PARTNERS[p].starters.map((id) => cardEl({ id, up: false })), ...heroCards);
    let grid: HTMLElement;
    if (hd.starter) {
      const p = PARTNERS[hd.starter];
      grid = h('div.starter-grid', null, h('div.starter.picked', null, h('div.starter-sprite', null, portrait(p.sprite, 110, true)), h('div.starter-name', { style: { color: p.color } }, p.name), h('div.starter-hp', null, `HP ${p.hp}`), h('div.starter-blurb', null, `${hd.name} always brings ${p.name}.`), h('div.passive-line', null, passiveText(p, 0))));
      showDeck(hd.starter);
    } else {
      // Only partners that can ever be a starter are listed; the rest join during runs.
      const cards = PARTNER_LIST.filter((p) => STARTER_POOL.includes(p.id)).map((p) => {
        const unlocked = app.meta.starters.includes(p.id);
        const el = h(
          'div.starter',
          { class: unlocked ? '' : 'locked' },
          h('div.starter-sprite', null, portrait(p.sprite, 110, true)),
          h('div.starter-name', { style: { color: p.color } }, unlocked ? p.name : '???'),
          unlocked ? h('div.starter-hp', null, `HP ${p.hp}`) : null,
          h('div.starter-blurb', null, unlocked ? heroText(p.blurb) : unlockHint(p.id)),
          unlocked ? h('div.passive-line', null, passiveText(p, 0)) : null,
        );
        if (unlocked) {
          el.addEventListener('click', () => {
            pick = p.id;
            sfx.select();
            for (const s of grid.children) s.classList.remove('picked');
            el.classList.add('picked');
            startBtn.classList.remove('disabled');
            showDeck(p.id);
          });
        }
        return el;
      });
      grid = h('div.starter-grid', null, ...cards);
    }
    const levelEl = h('div.level-picker');
    const drawLevel = () => {
      const step = (d: number) => () => {
        level = Math.max(0, Math.min(app.meta.maxLevel, level + d));
        sfx.select();
        drawLevel();
      };
      levelEl.replaceChildren(
        button('◀', step(-1), level <= 0 ? 'small disabled' : 'small'),
        tip(
          h('div.level-label', null, h('b', null, level ? `Star Level ${level}` : 'Normal'), h('small', null, level ? LEVELS[level - 1] : 'No extra challenge.'), level > 1 ? h('small.dim', null, `+ the ${level - 1} level${level > 2 ? 's' : ''} below`) : null),
          () => (level ? LEVELS.slice(0, level).map((t, i) => `<b>${i + 1}.</b> ${t}`).join('<br>') : 'Win a run at your highest Star Level to unlock the next one.'),
        ),
        button('▶', step(1), level >= app.meta.maxLevel ? 'small disabled' : 'small'),
      );
    };
    drawLevel();
    return [
      h('div.title-bg.dim', { style: { backgroundImage: 'url(bg/title_art.png)' } }),
      h('div.screen-title', null, hd.starter ? `${hd.name}'s team` : `Choose ${hd.name}'s first partner`),
      grid,
      preview,
      h(
        'div.starter-actions',
        null,
        button('Back', () => (unlockedHeroes.length > 1 ? ((hero = null), draw()) : app.showTitle())),
        app.meta.maxLevel > 0 ? levelEl : null,
        startBtn,
      ),
    ];
  };

  draw();
  return root;
}

/** Partners that can be unlocked as a starting partner. */
const STARTER_POOL: PartnerId[] = ['goombario', 'kooper', 'bombette', 'parakarry', 'bow', 'watt'];

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
