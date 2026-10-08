import type { BossChoice, CardInst, PartnerId, Reward, RunState, ShopStock } from './types';
import { Rng } from './rng';
import { generateMap } from './map';
import { Combat, type CombatKind } from './combat';
import { ACTS, FLOORS } from '../data/acts';
import { CARD_LIST } from '../data/cards';
import { BADGE_LIST, ITEM_LIST } from '../data/misc';
import { ALL_PARTNERS, RANK_HP } from '../data/partners';
import { BADGES, CARDS, PARTNERS } from '../data/registry';
import { EVENT_LIST, EVENTS } from '../data/events';

export const RUN_VERSION = 1;
export const MARIO_HP = 45;
export const START_DECK = ['jump', 'jump', 'jump', 'hammer', 'hammer', 'guard', 'guard', 'guard', 'guard'];
const STREAMS = ['map', 'combat', 'rewards', 'events', 'shop', 'enc'];

// ---------- rng ----------

/** Run `fn` with the named RNG stream and write its state back to the run. */
export function withRng<T>(run: RunState, stream: string, fn: (r: Rng) => T): T {
  const r = new Rng(run.rng[stream]);
  const out = fn(r);
  run.rng[stream] = r.state;
  return out;
}

// ---------- creation ----------

export function newRun(opts: { seed?: string; starter: PartnerId; hard?: boolean }): RunState {
  const seed = opts.seed ?? Math.random().toString(36).slice(2, 10).toUpperCase();
  const rng: Record<string, number> = {};
  for (const s of STREAMS) rng[s] = Rng.fromSeed(`${seed}:${s}`).state;
  const run: RunState = {
    version: RUN_VERSION,
    seed,
    rng,
    act: 1,
    map: { floors: FLOORS, nodes: {}, starts: [] },
    pos: null,
    current: null,
    visited: [],
    mario: { hp: MARIO_HP, maxHp: MARIO_HP },
    partners: [],
    deck: [],
    coins: 60,
    items: ['mushroom', null, null],
    badges: [],
    superBlocks: 0,
    starMax: 6,
    specials: ['refresh', 'lullaby'],
    bosses: [],
    seenEvents: [],
    removeCost: 75,
    hard: !!opts.hard,
    nextUid: 1,
    stats: { battles: 0, elites: 0, bosses: 0, damageDealt: 0, nice: 0, coinsEarned: 0 },
    screen: { kind: 'actIntro' },
    paradeBuff: 0,
    actFights: 0,
    lastEncounter: '',
  };
  for (const id of START_DECK) addCard(run, id);
  run.bosses = withRng(run, 'map', (r) => ACTS.map((a) => r.pick(a.bosses)));
  recruit(run, opts.starter);
  startAct(run, 1);
  return run;
}

export function startAct(run: RunState, act: number) {
  run.act = act;
  run.map = withRng(run, 'map', (r) => generateMap(r, FLOORS));
  run.pos = null;
  run.current = null;
  run.visited = [];
  run.actFights = 0;
  run.screen = { kind: 'actIntro' };
}

// ---------- deck ----------

export function addCard(run: RunState, id: string, up = false): CardInst {
  const inst = { uid: `c${run.nextUid++}`, id, up };
  run.deck.push(inst);
  return inst;
}

export function removeCard(run: RunState, uid: string) {
  run.deck = run.deck.filter((c) => c.uid !== uid);
}

export function upgradeCard(run: RunState, uid: string) {
  const c = run.deck.find((c) => c.uid === uid);
  if (c) c.up = true;
}

export function partnerRank(run: RunState, owner: string): number {
  return run.partners.find((p) => p.id === owner)?.rank ?? 0;
}

/** Cards shown as upgraded: own flag, or their partner has ranked up. */
export function isUpgraded(run: RunState, inst: CardInst): boolean {
  const owner = CARDS[inst.id].owner;
  return inst.up || (owner !== 'mario' && owner !== 'none' && partnerRank(run, owner) >= 1);
}

export function canUpgrade(run: RunState, inst: CardInst): boolean {
  const d = CARDS[inst.id];
  return !isUpgraded(run, inst) && d.type !== 'status' && d.type !== 'curse';
}

export function canDuplicate(_run: RunState, inst: CardInst): boolean {
  const d = CARDS[inst.id];
  return d.type !== 'status' && d.type !== 'curse';
}

/** Add a copy of a deck card (keeping its upgrade). */
export function duplicateCard(run: RunState, uid: string) {
  const c = run.deck.find((c) => c.uid === uid);
  if (c) addCard(run, c.id, c.up);
}

export function canRemove(_run: RunState, inst: CardInst): boolean {
  return CARDS[inst.id].owner === 'mario' || CARDS[inst.id].owner === 'none';
}

/** Card ids that can appear in rewards for the current team. */
export function cardPool(run: RunState, rarity: string): string[] {
  const owners = new Set<string>(['mario', ...run.partners.filter((p) => p.field).map((p) => p.id)]);
  return CARD_LIST.filter((c) => owners.has(c.owner) && c.rarity === rarity).map((c) => c.id);
}

/** A reward card id, with '+' suffix when pre-upgraded. */
export function rollCards(run: RunState, r: Rng, n: number, weights: [string, number][]): string[] {
  const out: string[] = [];
  const upChance = run.act === 1 ? 0 : run.act === 2 ? 0.12 : 0.25;
  for (let tries = 0; out.length < n && tries < 50; tries++) {
    const rarity = r.weighted(weights);
    const pool = cardPool(run, rarity).filter((id) => !out.some((o) => o.replace('+', '') === id));
    if (!pool.length) continue;
    const id = r.pick(pool);
    out.push(r.chance(upChance) ? `${id}+` : id);
  }
  return out;
}

export function parseCardId(s: string): { id: string; up: boolean } {
  return s.endsWith('+') ? { id: s.slice(0, -1), up: true } : { id: s, up: false };
}

export function transformCard(run: RunState, uid: string, r: Rng) {
  const inst = run.deck.find((c) => c.uid === uid);
  if (!inst) return;
  const owner = CARDS[inst.id].owner;
  const pool = CARD_LIST.filter((c) => c.owner === (owner === 'none' ? 'mario' : owner) && c.id !== inst.id && ['common', 'uncommon', 'rare'].includes(c.rarity));
  if (pool.length) inst.id = r.pick(pool).id;
}

// ---------- items & badges ----------

export function addItem(run: RunState, id: string): boolean {
  const slot = run.items.indexOf(null);
  if (slot < 0) return false;
  run.items[slot] = id;
  return true;
}

export function rollItem(r: Rng, weights: [string, number][] = [['common', 65], ['uncommon', 28], ['rare', 7]]): string {
  const rarity = r.weighted(weights);
  return r.pick(ITEM_LIST.filter((i) => i.rarity === rarity)).id;
}

export function addBadge(run: RunState, id: string) {
  if (run.badges.includes(id)) return;
  run.badges.push(id);
  BADGES[id].onGain?.(run);
}

export function rollBadge(run: RunState, r: Rng, weights: [string, number][] = [['common', 55], ['uncommon', 33], ['rare', 12]]): string | null {
  for (let i = 0; i < 20; i++) {
    const rarity = r.weighted(weights);
    const pool = BADGE_LIST.filter((b) => b.rarity === rarity && !run.badges.includes(b.id));
    if (pool.length) return r.pick(pool).id;
  }
  const any = BADGE_LIST.filter((b) => b.rarity !== 'boss' && !run.badges.includes(b.id));
  return any.length ? r.pick(any).id : null;
}

// ---------- partners ----------

export function recruit(run: RunState, id: PartnerId) {
  if (run.partners.some((p) => p.id === id)) return;
  const def = PARTNERS[id];
  const field = run.partners.filter((p) => p.field).length < 2;
  run.partners.push({ id, hp: def.hp, maxHp: def.hp, rank: 0, field });
  for (const c of def.starters) addCard(run, c);
}

export function setField(run: RunState, id: PartnerId, field: boolean): boolean {
  const p = run.partners.find((p) => p.id === id);
  if (!p) return false;
  if (field && !p.field && run.partners.filter((x) => x.field).length >= 2) return false;
  p.field = field;
  return true;
}

export function rankUp(run: RunState, id: PartnerId): boolean {
  const p = run.partners.find((p) => p.id === id);
  if (!p || p.rank >= 2) return false;
  p.rank = (p.rank + 1) as 1 | 2;
  p.maxHp += RANK_HP;
  p.hp = Math.min(p.maxHp, Math.max(p.hp, 0) + RANK_HP);
  return true;
}

export function unownedPartners(run: RunState): PartnerId[] {
  return ALL_PARTNERS.filter((id) => !run.partners.some((p) => p.id === id));
}

export function healTeam(run: RunState, pct: number) {
  run.mario.hp = Math.min(run.mario.maxHp, run.mario.hp + Math.ceil(run.mario.maxHp * pct));
  for (const p of run.partners) p.hp = Math.min(p.maxHp, Math.max(p.hp, 0) + Math.ceil(p.maxHp * pct));
}

// ---------- map flow ----------

export function enterNode(run: RunState, nodeId: string) {
  const node = run.map.nodes[nodeId];
  run.current = nodeId;
  run.visited.push(nodeId);
  const act = ACTS[run.act - 1];
  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss': {
      const fight: CombatKind = node.type === 'battle' ? 'normal' : node.type;
      const { enemies, bg } = withRng(run, 'enc', (r) => {
        if (fight === 'boss') {
          const boss = run.bosses[run.act - 1];
          return { enemies: [...(act.bossParty[boss] ?? []), boss], bg: act.bossBg };
        }
        const pool = fight === 'elite' ? act.elite : run.actFights < 3 ? act.easy : act.normal;
        const options = pool.filter((e) => e.join() !== run.lastEncounter);
        const pick = r.pick(options.length ? options : pool);
        return { enemies: pick, bg: r.pick(act.backgrounds) };
      });
      if (fight === 'normal') run.actFights++;
      run.lastEncounter = enemies.join();
      run.screen = { kind: 'battle', node: nodeId, enemies, fight, bg };
      break;
    }
    case 'event': {
      const ev = withRng(run, 'events', (r) => {
        const pool = EVENT_LIST.filter((e) => e.acts.includes(run.act) && !run.seenEvents.includes(e.id) && (!e.when || e.when(run)));
        return pool.length ? r.pick(pool).id : 'block';
      });
      run.seenEvents.push(ev);
      run.screen = { kind: 'event', node: nodeId, event: ev, step: 'start', data: {} };
      EVENTS[ev].init?.(run, run.screen.data);
      break;
    }
    case 'shop':
      run.screen = { kind: 'shop', node: nodeId, stock: makeShop(run) };
      break;
    case 'rest':
      run.screen = { kind: 'rest', node: nodeId, used: false };
      break;
    case 'treasure':
      run.screen = { kind: 'treasure', node: nodeId, reward: treasureReward(run) };
      break;
    case 'partner': {
      const offer = withRng(run, 'rewards', (r) => r.sample(unownedPartners(run), 2));
      run.screen = { kind: 'partner', node: nodeId, offer };
      break;
    }
  }
}

/** Finish the current node and return to the map. */
export function completeNode(run: RunState) {
  if (run.current) run.pos = run.current;
  run.current = null;
  run.screen = { kind: 'map' };
}

export function makeCombat(run: RunState): Combat {
  const s = run.screen;
  if (s.kind !== 'battle') throw new Error('not in battle');
  const c = new Combat(run, s.enemies, s.fight, new Rng(run.rng.combat));
  c.begin();
  return c;
}

/** Apply a finished combat to the run and move to the right screen. */
export function finishCombat(run: RunState, c: Combat) {
  const s = run.screen;
  if (s.kind !== 'battle') return;
  run.rng.combat = c.rng.state;
  run.stats.damageDealt += c.damageDealt;
  run.stats.nice += c.niceCount;
  if (c.result !== 'win') {
    run.mario.hp = 0;
    run.screen = { kind: 'gameover' };
    return;
  }
  run.mario.hp = Math.max(1, c.mario.hp);
  for (const u of c.allies.slice(1)) {
    const p = run.partners.find((p) => p.id === u.id);
    if (p) p.hp = u.dead ? 1 : Math.max(1, u.hp);
  }
  run.items = c.items;
  run.coins = Math.max(0, run.coins - c.stolen);
  if (run.paradeBuff > 0) run.paradeBuff--;
  if (run.badges.includes('heartFinder')) healFlat(run, 5);
  if (s.fight === 'normal') run.stats.battles++;
  if (s.fight === 'elite') run.stats.elites++;
  if (s.fight === 'boss') {
    run.stats.bosses++;
    run.screen = { kind: 'bossReward', choices: bossChoices(run), reward: battleReward(run, 'boss') };
    return;
  }
  run.screen = { kind: 'reward', reward: battleReward(run, s.fight) };
}

function healFlat(run: RunState, n: number) {
  run.mario.hp = Math.min(run.mario.maxHp, run.mario.hp + n);
  for (const p of run.partners) p.hp = Math.min(p.maxHp, p.hp + n);
}

/** After the boss reward: next act, or victory. */
export function advanceAct(run: RunState) {
  if (run.act >= ACTS.length) {
    run.screen = { kind: 'victory' };
    return;
  }
  const unlock = run.act === 1 ? 'starStorm' : 'chillOutStar';
  if (!run.specials.includes(unlock)) run.specials.push(unlock);
  run.mario.hp = run.mario.maxHp;
  for (const p of run.partners) p.hp = p.maxHp;
  startAct(run, run.act + 1);
}

// ---------- rewards ----------

function emptyTaken(r: Omit<Reward, 'taken'>): Reward {
  return { ...r, taken: { cards: r.cards.map(() => false), items: r.items.map(() => false), badges: r.badges.map(() => false) } };
}

export function battleReward(run: RunState, fight: CombatKind): Reward {
  return withRng(run, 'rewards', (r) => {
    const money = run.badges.includes('moneyMoney') ? 1.4 : 1;
    const coins = Math.round((fight === 'boss' ? r.int(70, 90) : fight === 'elite' ? r.int(28, 38) : r.int(12, 20)) * money);
    const weights: [string, number][] =
      fight === 'boss' ? [['rare', 1]] : fight === 'elite' ? [['common', 50], ['uncommon', 38], ['rare', 12]] : [['common', 63], ['uncommon', 32], ['rare', 5]];
    const items = r.chance(fight === 'elite' ? 0.5 : fight === 'normal' ? 0.35 : 0) ? [rollItem(r)] : [];
    const badge = fight === 'elite' ? rollBadge(run, r) : null;
    const superBlocks = fight === 'elite' && r.chance(0.45) ? 1 : 0;
    return emptyTaken({ coins, cards: [rollCards(run, r, 3, weights)], items, badges: badge ? [badge] : [], superBlocks });
  });
}

export function treasureReward(run: RunState): Reward {
  return withRng(run, 'rewards', (r) => {
    const badge = rollBadge(run, r, [['common', 55], ['uncommon', 33], ['rare', 12]]);
    return emptyTaken({ coins: r.int(25, 45), cards: [], items: [], badges: badge ? [badge] : [], superBlocks: r.chance(0.3) ? 1 : 0 });
  });
}

export function bossChoices(run: RunState): BossChoice[] {
  return withRng(run, 'rewards', (r) => {
    const out: BossChoice[] = [];
    const free = unownedPartners(run);
    if (free.length) out.push({ kind: 'partner', id: r.pick(free) });
    if (run.partners.some((p) => p.rank < 2)) out.push({ kind: 'rankup' });
    const badge = run.badges.includes('fpPlus') ? rollBadge(run, r, [['rare', 1]]) : 'fpPlus';
    if (badge) out.push({ kind: 'badge', id: badge });
    return out;
  });
}

export function claimCoins(run: RunState, rw: Reward) {
  if (rw.taken.coins) return;
  rw.taken.coins = true;
  run.coins += rw.coins;
  run.stats.coinsEarned += rw.coins;
}

export function claimCard(run: RunState, rw: Reward, idx: number, card: string) {
  if (rw.taken.cards[idx]) return;
  rw.taken.cards[idx] = true;
  const { id, up } = parseCardId(card);
  addCard(run, id, up);
}

export function claimItem(run: RunState, rw: Reward, idx: number): boolean {
  if (rw.taken.items[idx]) return false;
  if (!addItem(run, rw.items[idx])) return false;
  rw.taken.items[idx] = true;
  return true;
}

export function claimBadge(run: RunState, rw: Reward, idx: number) {
  if (rw.taken.badges[idx]) return;
  rw.taken.badges[idx] = true;
  addBadge(run, rw.badges[idx]);
}

export function claimSuperBlock(run: RunState, rw: Reward) {
  if (rw.taken.superBlocks || !rw.superBlocks) return;
  rw.taken.superBlocks = true;
  run.superBlocks += rw.superBlocks;
}

// ---------- shop ----------

const PRICE: Record<string, [number, number]> = {
  common: [45, 55],
  uncommon: [70, 82],
  rare: [140, 160],
  icommon: [28, 36],
  iuncommon: [50, 60],
  irare: [80, 92],
  bcommon: [130, 150],
  buncommon: [180, 210],
  brare: [250, 280],
};

export function makeShop(run: RunState): ShopStock {
  return withRng(run, 'shop', (r) => {
    const price = (k: string) => r.int(...PRICE[k]);
    const cards: ShopStock['cards'] = [];
    const weights: [string, number][] = [['common', 55], ['uncommon', 35], ['rare', 10]];
    const field = run.partners.filter((p) => p.field).map((p) => p.id as string);
    for (let i = 0; i < 5; i++) {
      const owner = i < 3 || !field.length ? 'mario' : field[i % field.length];
      for (let t = 0; t < 20; t++) {
        const rarity = r.weighted(weights);
        const pool = CARD_LIST.filter((c) => c.owner === owner && c.rarity === rarity && !cards.some((x) => x.id === c.id));
        if (!pool.length) continue;
        cards.push({ id: r.pick(pool).id, price: price(rarity), sold: false });
        break;
      }
    }
    const items: ShopStock['items'] = [];
    while (items.length < 3) {
      const id = rollItem(r);
      if (items.some((x) => x.id === id)) continue;
      const rar = ITEM_LIST.find((i) => i.id === id)!.rarity;
      items.push({ id, price: price(`i${rar}`), sold: false });
    }
    const badges: ShopStock['badges'] = [];
    for (let i = 0; i < 2; i++) {
      const id = rollBadge({ ...run, badges: [...run.badges, ...badges.map((b) => b.id)] }, r);
      if (id) badges.push({ id, price: price(`b${BADGES[id].rarity === 'boss' ? 'rare' : BADGES[id].rarity}`), sold: false });
    }
    return { cards, items, badges, superBlock: r.chance(0.4) ? { price: r.int(110, 130), sold: false } : null, removeUsed: false };
  });
}

export function spend(run: RunState, price: number): boolean {
  if (run.coins < price) return false;
  run.coins -= price;
  return true;
}

export { ACTS, CARDS };
