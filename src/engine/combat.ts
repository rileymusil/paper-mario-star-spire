import type { AtkKind, CardInst, CEvent, Intent, PartnerId, RunState, StatusId, Unit } from './types';
import type { CardDef, MoveDef } from './defs';
import { Rng } from './rng';
import { CARDS, ENEMIES, ITEMS, PARTNERS, SPECIALS } from '../data/registry';

export interface AttackOpts {
  hits?: number;
  kind?: AtkKind;
  pierce?: boolean;
  /** contact attacks trigger Static; default true */
  contact?: boolean;
  /** flips shelled foes even if not a jump */
  flip?: boolean;
  fire?: boolean;
  /** skip the Nice! timing bonus */
  noNice?: boolean;
}

export interface EnemyStep {
  uid: string;
  intent?: Intent;
  /** true when the enemy lost its action (dizzy, asleep, flipped, reviving) */
  skip: boolean;
}

export type CombatKind = 'normal' | 'elite' | 'boss';

const DURATION: StatusId[] = ['shrunk', 'soft'];
const STUN_IMMUNE_TRAITS = ['boss'];
export const HAND_MAX = 10;
export const GUARD_REDUCTION = 2;

/** Card-play context: the API card definitions use to affect the battle. */
export class Ctx {
  constructor(
    public c: Combat,
    public src: Unit,
    public target: Unit | undefined,
    public nice: boolean,
    public up: boolean,
  ) {}

  get mario(): Unit {
    return this.c.mario;
  }
  get partners(): Unit[] {
    return this.c.livingPartners();
  }
  get enemies(): Unit[] {
    return this.c.livingEnemies();
  }
  get allies(): Unit[] {
    return this.c.livingAllies();
  }

  private bonus(base: number, hits: number, opts: AttackOpts): number {
    if (!this.nice || opts.noNice) return base;
    return base + (hits > 1 ? 1 : 2) + (this.c.has('attackFx') ? 1 : 0);
  }

  attack(base: number, opts: AttackOpts = {}, target = this.target): number {
    if (!target || target.dead) return 0;
    return this.c.attack(this.src, target, this.bonus(base, opts.hits ?? 1, opts), opts);
  }

  /** Hit every living enemy the attack can reach. */
  attackAll(base: number, opts: AttackOpts = {}): number {
    let total = 0;
    const b = this.bonus(base, opts.hits ?? 1, opts);
    for (const e of this.c.livingEnemies()) {
      if (!this.c.canReach(opts.kind, e)) continue;
      total += this.c.attack(this.src, e, b, opts, false);
    }
    this.c.consumeCharge(this.src);
    return total;
  }

  /** Hit random reachable enemies `times` times. */
  attackRandom(base: number, times: number, opts: AttackOpts = {}): number {
    let total = 0;
    const b = this.bonus(base, times, { ...opts, hits: times });
    for (let i = 0; i < times; i++) {
      const pool = this.c.livingEnemies().filter((e) => this.c.canReach(opts.kind, e));
      if (!pool.length) break;
      total += this.c.attack(this.src, this.c.rng.pick(pool), b, { ...opts, hits: 1 }, i === 0);
    }
    this.c.consumeCharge(this.src);
    return total;
  }

  block(n: number, unit: Unit = this.mario) {
    this.c.gainBlock(unit, n);
  }
  blockAll(n: number) {
    for (const a of this.c.livingAllies()) this.c.gainBlock(a, n);
  }
  apply(id: StatusId, n: number, unit = this.target) {
    if (unit) this.c.applyStatus(unit, id, n);
  }
  applyAllEnemies(id: StatusId, n: number) {
    for (const e of this.c.livingEnemies()) this.c.applyStatus(e, id, n);
  }
  heal(n: number, unit: Unit = this.mario) {
    this.c.heal(unit, n);
  }
  healAll(n: number) {
    for (const a of this.c.livingAllies()) this.c.heal(a, n);
  }
  draw(n: number) {
    this.c.draw(n);
  }
  gainFp(n: number) {
    this.c.gainFp(n);
  }
  gainStar(n: number) {
    this.c.gainStar(n);
  }
  power(id: string, n: number) {
    this.c.powers[id] = (this.c.powers[id] ?? 0) + n;
    this.c.emit({ t: 'text', target: this.src.uid, text: 'Power up!', color: '#ffd84a' });
  }
  hurtSelf(n: number) {
    this.c.loseHp(this.src, n);
  }
}

export class Combat {
  allies: Unit[] = [];
  enemies: Unit[] = [];
  drawPile: CardInst[] = [];
  hand: CardInst[] = [];
  discard: CardInst[] = [];
  exhaustPile: CardInst[] = [];
  fp = 0;
  maxFp = 3;
  turn = 0;
  phase: 'player' | 'enemy' | 'over' = 'player';
  result: 'win' | 'lose' | null = null;
  star = 0;
  starMax: number;
  powers: Record<string, number> = {};
  events: CEvent[] = [];
  items: (string | null)[];
  stolen = 0;
  bonusFpNext = 0;
  queue: string[] = [];
  niceCount = 0;
  damageDealt = 0;
  private uidN = 0;

  constructor(
    public run: RunState,
    enemyIds: string[],
    public kind: CombatKind,
    public rng: Rng,
  ) {
    this.items = run.items.slice();
    this.starMax = run.starMax + (this.has('deepFocus') ? 2 : 0);
    this.allies.push(this.makeAlly('mario', 'Mario', 'mario', run.mario.hp, run.mario.maxHp));
    for (const p of run.partners.filter((p) => p.field)) {
      const def = PARTNERS[p.id];
      const u = this.makeAlly(p.id, def.name, def.sprite, p.hp, p.maxHp);
      if (p.hp <= 0) {
        u.hp = 0;
        u.dead = true;
      }
      if (p.rank >= 2) u.st.strength = 2;
      this.allies.push(u);
    }
    for (const id of enemyIds) this.addEnemy(id, false);
    const field = new Set(run.partners.filter((p) => p.field).map((p) => p.id as string));
    const rankOf = (id: string) => run.partners.find((p) => p.id === id)?.rank ?? 0;
    for (const inst of run.deck) {
      const def = CARDS[inst.id];
      if (def.owner !== 'mario' && def.owner !== 'none' && !field.has(def.owner)) continue;
      const up = inst.up || (def.owner !== 'mario' && def.owner !== 'none' && rankOf(def.owner) >= 1);
      this.drawPile.push({ ...inst, up });
    }
    this.rng.shuffle(this.drawPile);
  }

  // ---------- setup ----------

  private makeAlly(uid: string, name: string, sprite: string, hp: number, maxHp: number): Unit {
    return { uid, side: 'ally', id: uid, name, sprite, pose: 'idle', hp, maxHp, block: 0, armor: 0, st: {}, traits: [], dead: false, mem: {} };
  }

  addEnemy(id: string, summoned: boolean): Unit | null {
    if (this.enemies.filter((e) => !e.dead || e.mem.revive).length >= 5) return null;
    const def = ENEMIES[id];
    if (!def) throw new Error(`unknown enemy ${id}`);
    let hp = this.rng.int(def.hp[0], def.hp[1]);
    if (this.run.hard) hp = Math.round(hp * 1.2);
    const u: Unit = {
      uid: `e${this.uidN++}`,
      side: 'enemy',
      id,
      name: def.name,
      sprite: def.sprite,
      pose: 'idle',
      hp,
      maxHp: hp,
      block: 0,
      armor: def.armor ?? 0,
      st: {},
      traits: [...(def.traits ?? [])],
      dead: false,
      mem: {},
    };
    if (summoned) u.traits.push('minion');
    this.enemies.push(u);
    def.init?.(u, this);
    if (summoned) {
      this.emit({ t: 'summon', target: u.uid });
      this.chooseIntent(u);
    }
    return u;
  }

  begin() {
    if (this.has('megaRush')) this.mario.st.strength = (this.mario.st.strength ?? 0) + 2;
    if (this.has('zapTap')) this.mario.st.static = 2;
    if (this.has('luckyStar')) this.star = Math.min(this.starMax, this.star + 3);
    if (this.run.paradeBuff > 0) this.star = Math.min(this.starMax, this.star + 2);
    if (this.has('chillOut')) for (const e of this.enemies) this.applyStatus(e, 'shrunk', 1);
    if (this.has('fpPlus')) this.maxFp += 1;
    for (const e of this.enemies) this.chooseIntent(e);
    this.startTurn();
    this.events = [];
  }

  // ---------- queries ----------

  get mario(): Unit {
    return this.allies[0];
  }
  has(badge: string): boolean {
    return this.run.badges.includes(badge);
  }
  unit(uid: string): Unit | undefined {
    return this.allies.find((u) => u.uid === uid) ?? this.enemies.find((u) => u.uid === uid);
  }
  livingAllies(): Unit[] {
    return this.allies.filter((u) => !u.dead);
  }
  livingPartners(): Unit[] {
    return this.allies.slice(1).filter((u) => !u.dead);
  }
  livingEnemies(): Unit[] {
    return this.enemies.filter((u) => !u.dead);
  }
  emit(e: CEvent) {
    this.events.push(e);
  }
  takeEvents(): CEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  canReach(kind: AtkKind | undefined, target: Unit): boolean {
    if (kind === 'hammer' || kind === 'ground') return !target.traits.includes('flying');
    return true;
  }

  cardDef(inst: CardInst): CardDef {
    return CARDS[inst.id];
  }

  cost(inst: CardInst): number {
    if (inst.free) return 0;
    const d = CARDS[inst.id];
    return inst.up && d.costUp !== undefined ? d.costUp : d.cost;
  }

  /** The unit that performs a card (Mario for his own and neutral cards). */
  cardSource(inst: CardInst): Unit | undefined {
    const owner = CARDS[inst.id].owner;
    if (owner === 'mario' || owner === 'none') return this.mario;
    return this.allies.find((u) => u.id === owner);
  }

  targetsFor(inst: CardInst): Unit[] {
    const d = CARDS[inst.id];
    if (d.target === 'enemy') return this.livingEnemies().filter((e) => this.canReach(d.atk, e));
    if (d.target === 'ally') return this.livingAllies();
    return [];
  }

  /** Why a card can't be played right now, or null if it can. */
  whyNot(inst: CardInst): string | null {
    const d = CARDS[inst.id];
    if (this.phase !== 'player') return 'Not your turn';
    if (d.unplayable) return 'Unplayable';
    const src = this.cardSource(inst);
    if (!src || src.dead) return `${src?.name ?? 'Partner'} is KO'd`;
    if (src.st.dizzy && src !== this.mario) return `${src.name} is dizzy`;
    if (this.cost(inst) > this.fp) return 'Not enough FP';
    if (d.target === 'enemy' && this.targetsFor(inst).length === 0) return d.atk === 'hammer' || d.atk === 'ground' ? "Can't reach flying foes" : 'No target';
    return null;
  }

  // ---------- turn flow ----------

  startTurn() {
    this.turn++;
    this.phase = 'player';
    for (const a of this.allies) {
      a.block = 0;
      delete a.st.hidden;
    }
    for (const a of this.livingAllies()) this.tickBurn(a);
    if (this.checkEnd()) return;
    const chill = this.mario.st.chill ?? 0;
    delete this.mario.st.chill;
    this.fp = Math.max(0, this.maxFp + (this.powers.battery ?? 0) + this.bonusFpNext - chill);
    if (this.has('happyFlower') && this.turn % 3 === 0) this.fp += 1;
    this.bonusFpNext = 0;
    if (this.turn === 1) {
      if (this.has('defendPlus')) this.gainBlock(this.mario, 6);
      if (this.has('damageDodge')) for (const p of this.livingPartners()) this.gainBlock(p, 5);
    }
    if (this.has('happyHeart')) this.heal(this.mario, 1);
    if (this.powers.rainDance) for (const a of this.livingAllies()) this.gainBlock(a, this.powers.rainDance);
    if (this.powers.poltergeist) for (const e of this.livingEnemies()) this.attack(undefined, e, this.powers.poltergeist, { pierce: true }, false);
    if (this.powers.tattleLog) {
      const live = this.livingEnemies();
      if (live.length) this.applyStatus(this.rng.pick(live), 'soft', this.powers.tattleLog);
    }
    if (this.turn > 1) this.gainStar(1);
    let n = 5 + (this.powers.expressMail ?? 0);
    if (this.turn === 1 && this.has('firstAttack')) n += 2;
    this.draw(n);
    this.checkEnd();
  }

  draw(n: number) {
    for (let i = 0; i < n; i++) {
      if (this.drawPile.length === 0) {
        if (this.discard.length === 0) break;
        this.drawPile = this.rng.shuffle(this.discard);
        this.discard = [];
      }
      const card = this.drawPile.pop()!;
      if (this.hand.length >= HAND_MAX) this.discard.push(card);
      else this.hand.push(card);
    }
    this.emit({ t: 'cards' });
  }

  gainFp(n: number) {
    this.fp += n;
    this.emit({ t: 'fp', n });
  }

  gainStar(n: number) {
    const before = this.star;
    this.star = Math.min(this.starMax, this.star + n);
    if (this.star !== before) this.emit({ t: 'star', n: this.star - before });
  }

  play(handIdx: number, targetUid: string | undefined, nice: boolean): boolean {
    const inst = this.hand[handIdx];
    if (!inst || this.whyNot(inst)) return false;
    const d = CARDS[inst.id];
    let target: Unit | undefined;
    if (d.target === 'enemy' || d.target === 'ally') {
      target = this.targetsFor(inst).find((u) => u.uid === targetUid);
      if (!target) return false;
    }
    this.fp -= this.cost(inst);
    this.hand.splice(handIdx, 1);
    delete inst.free;
    const src = this.cardSource(inst)!;
    const isAttack = d.type === 'attack';
    if (isAttack && nice) {
      this.niceCount++;
      this.gainStar(1);
    }
    d.play(new Ctx(this, src, target, isAttack && nice, inst.up), inst.up);
    if (d.type === 'power') {
      // powers leave the deck for the rest of the fight
    } else if (d.exhaust && !(inst.up && d.exhaustUp === false)) {
      this.exhaustPile.push(inst);
    } else {
      this.discard.push(inst);
    }
    this.emit({ t: 'cards' });
    this.checkEnd();
    return true;
  }

  endTurn() {
    if (this.phase !== 'player') return;
    for (const inst of this.hand.slice()) CARDS[inst.id].endOfTurnInHand?.(this);
    const keep: CardInst[] = [];
    for (const inst of this.hand) {
      const d = CARDS[inst.id];
      delete inst.free;
      if (d.retain) keep.push(inst);
      else if (d.ethereal) this.exhaustPile.push(inst);
      else this.discard.push(inst);
    }
    this.hand = keep;
    if (this.powers.shellFortress) this.gainBlock(this.mario, this.powers.shellFortress);
    if (this.powers.happyHeart) this.heal(this.mario, this.powers.happyHeart);
    for (const a of this.livingAllies()) {
      this.tickRegen(a);
      delete a.st.pumped;
      this.tickDurations(a);
      if (a.st.dizzy) this.dec(a, 'dizzy');
    }
    this.emit({ t: 'cards' });
    if (this.checkEnd()) return;
    this.phase = 'enemy';
    this.queue = this.enemies.filter((e) => !e.dead || e.mem.revive).map((e) => e.uid);
  }

  /** Advance to the next acting enemy. Returns null when the enemy phase is over (player turn has started). */
  enemyStep(): EnemyStep | null {
    while (this.phase === 'enemy' && this.queue.length) {
      const e = this.unit(this.queue.shift()!)!;
      if (e.dead && e.mem.revive) {
        e.mem.revive--;
        if (e.mem.revive <= 0) {
          e.dead = false;
          e.hp = Math.ceil(e.maxHp / 2);
          e.pose = 'idle';
          delete e.mem.revive;
          this.emit({ t: 'revive', target: e.uid });
          this.emit({ t: 'pose', target: e.uid, pose: 'idle' });
          this.chooseIntent(e);
        }
        return { uid: e.uid, skip: true };
      }
      if (e.dead) continue;
      e.block = 0;
      delete e.st.vanish;
      this.tickBurn(e);
      if (e.dead) {
        if (this.checkEnd()) return null;
        continue;
      }
      if (e.st.flipped) {
        delete e.st.flipped;
        e.pose = 'idle';
        this.emit({ t: 'pose', target: e.uid, pose: 'idle' });
        this.emit({ t: 'text', target: e.uid, text: 'Got up!' });
        this.endEnemyAction(e);
        return { uid: e.uid, skip: true };
      }
      if (e.st.sleep) {
        this.dec(e, 'sleep');
        this.emit({ t: 'text', target: e.uid, text: 'Zzz...' });
        this.endEnemyAction(e);
        return { uid: e.uid, skip: true };
      }
      if (e.st.dizzy) {
        this.dec(e, 'dizzy');
        this.emit({ t: 'text', target: e.uid, text: 'Dizzy!' });
        this.endEnemyAction(e);
        return { uid: e.uid, skip: true };
      }
      if (!e.intent) this.chooseIntent(e);
      this.retarget(e);
      return { uid: e.uid, intent: e.intent, skip: false };
    }
    if (this.phase === 'enemy') {
      for (const e of this.livingEnemies()) delete e.st.hidden;
      this.startTurn();
    }
    return null;
  }

  /** Does this enemy's current intent hit an ally (so a guard prompt makes sense)? */
  intentHits(e: Unit): boolean {
    const m = e.intent && ENEMIES[e.id].moves[e.intent.move];
    return !!m && (m.dmg ?? 0) > 0;
  }

  enemyAct(uid: string, guarded: boolean) {
    const e = this.unit(uid);
    if (!e || e.dead || !e.intent) return;
    const move = ENEMIES[e.id].moves[e.intent.move];
    const targets = this.moveTargets(e, move);
    if (guarded && (move.dmg ?? 0) > 0) {
      this.niceCount++;
      this.gainStar(1);
    }
    if (move.block) this.gainBlock(e, move.block);
    if (move.dmg) {
      for (const t of targets) {
        this.attack(e, t, move.dmg, { hits: move.hits ?? 1, contact: move.contact ?? true }, true, guarded);
      }
    }
    for (const [id, n, to] of move.apply ?? []) {
      const list =
        to === 'self' ? [e] : to === 'enemies' ? this.livingEnemies() : to === 'allies' ? this.livingAllies() : targets.filter((t) => !t.dead);
      for (const u of list) this.applyStatus(u, id, n);
    }
    move.fx?.(this, e, targets[0]);
    if (!e.dead) this.endEnemyAction(e);
    this.checkEnd();
  }

  private endEnemyAction(e: Unit) {
    this.tickDurations(e);
    if (e.st.growth) this.applyStatus(e, 'strength', e.st.growth);
    if (!e.dead) this.chooseIntent(e);
  }

  private moveTargets(e: Unit, move: MoveDef): Unit[] {
    if (move.tgt === 'all') return this.livingAllies();
    if (move.tgt === 'self' || move.tgt === 'none') return [];
    const t = e.intent?.target ? this.unit(e.intent.target) : undefined;
    return t && !t.dead ? [t] : [this.mario];
  }

  chooseIntent(e: Unit) {
    this.setIntent(e, ENEMIES[e.id].ai(e, this));
  }

  /** Set an enemy's next move (and pick its target). */
  setIntent(e: Unit, id: string) {
    const def = ENEMIES[e.id];
    const m = def.moves[id];
    if (!m) throw new Error(`${e.id} has no move ${id}`);
    e.mem.last = id;
    e.mem.history = [...(e.mem.history ?? []), id].slice(-4);
    let target: string | undefined;
    const live = this.livingAllies();
    if (m.tgt === 'all') target = 'all';
    else if (m.tgt === 'partner') {
      const ps = this.livingPartners();
      target = ps.length ? this.rng.pick(ps).uid : 'mario';
    } else if (m.tgt === 'random') target = live.length ? this.rng.pick(live).uid : 'mario';
    else if (m.tgt === 'mario') target = 'mario';
    e.intent = { move: id, name: m.name, kind: m.kind, dmg: m.dmg, hits: m.hits, target, countdown: e.mem.countdown };
  }

  private retarget(e: Unit) {
    const t = e.intent?.target;
    if (!t || t === 'all') return;
    const u = this.unit(t);
    if (!u || u.dead) e.intent!.target = 'mario';
  }

  // ---------- damage ----------

  /** Damage one hit would deal, before block. */
  calc(src: Unit | undefined, target: Unit, base: number, opts: AttackOpts = {}, first = true): number {
    let d = base;
    if (src) {
      d += (src.st.strength ?? 0) + (src.st.pumped ?? 0);
      if (first) d += src.st.charge ?? 0;
      if (src.side === 'ally') {
        if (src.uid === 'mario') {
          if (this.has('powerPlus')) d += 1;
          if (opts.kind === 'jump' && this.has('powerJump')) d += 2;
          if (opts.kind === 'jump' && this.powers.spikeShield) d += this.powers.spikeShield;
          if (opts.kind === 'hammer' && this.has('powerSmash')) d += 2;
          if (this.has('lastStand') && src.hp <= src.maxHp * 0.3) d += 3;
        }
        if (this.has('pUpDDown')) d += 1;
      }
      if (src.st.shrunk) d = Math.floor(d * 0.75);
    }
    if (target.st.soft) d = Math.floor(d * 1.5);
    if (!opts.pierce && !target.st.flipped) d -= target.armor;
    if (target.side === 'ally' && this.has('pUpDDown')) d += 1;
    if (target.side === 'ally' && target.uid !== 'mario' && this.powers.cloudCover) d = Math.floor(d / 2);
    d = Math.max(0, d);
    if (target.st.vanish && d > 0) d = 1;
    return d;
  }

  /** Full attack: spiky checks, every hit, flips/grounding, charge consumption. Returns HP lost by target. */
  attack(src: Unit | undefined, target: Unit, base: number, opts: AttackOpts = {}, consume = true, guarded = false): number {
    if (target.dead) return 0;
    const hits = opts.hits ?? 1;
    if (src?.side === 'ally' && opts.kind === 'jump' && target.traits.includes('spiky')) {
      const shielded = src.uid === 'mario' && (this.has('spikeShield') || this.powers.spikeShield);
      if (!shielded) {
        this.emit({ t: 'text', target: src.uid, text: 'Ouch! Spiky!', color: '#ff7070' });
        this.loseHp(src, 3);
        if (src.dead) return 0;
      }
    }
    let total = 0;
    for (let i = 0; i < hits && !target.dead; i++) total += this.hit(src, target, base, opts, i === 0, guarded);
    if (!target.dead && src?.side === 'ally') {
      if ((opts.kind === 'jump' || opts.flip) && target.traits.includes('shelled') && !target.st.flipped) {
        target.st.flipped = 1;
        target.pose = 'flipped';
        this.emit({ t: 'pose', target: target.uid, pose: 'flipped' });
        this.emit({ t: 'text', target: target.uid, text: 'Flipped!', color: '#9fe3ff' });
      }
      if (opts.kind === 'jump' && target.traits.includes('winged')) this.ground(target);
    }
    if (consume && src) this.consumeCharge(src);
    return total;
  }

  consumeCharge(src: Unit) {
    if (src.st.charge) {
      delete src.st.charge;
      this.emit({ t: 'status', target: src.uid, id: 'charge', n: 0 });
    }
  }

  /** Winged foes lose their wings when stomped: no longer flying. */
  ground(u: Unit) {
    u.traits = u.traits.filter((t) => t !== 'winged' && t !== 'flying');
    const def = ENEMIES[u.id];
    const grounded = def.id === 'paragoomba' ? 'goomba' : def.sprite;
    u.sprite = grounded;
    u.mem.grounded = true;
    this.emit({ t: 'pose', target: u.uid, pose: 'idle', sprite: grounded });
    this.emit({ t: 'text', target: u.uid, text: 'Grounded!', color: '#9fe3ff' });
  }

  hit(src: Unit | undefined, target: Unit, base: number, opts: AttackOpts, first: boolean, guarded = false): number {
    if (target.dead) return 0;
    let d = this.calc(src, target, base, opts, first);
    if (target.st.hidden || (src?.side === 'enemy' && this.has('prettyLucky') && this.rng.chance(0.1))) {
      this.emit({ t: 'hit', target: target.uid, src: src?.uid, dmg: 0, blocked: 0, miss: true });
      return 0;
    }
    if (guarded) d = Math.max(0, d - GUARD_REDUCTION);
    const blocked = Math.min(target.block, d);
    target.block -= blocked;
    const loss = Math.min(target.hp, d - blocked);
    target.hp -= d - blocked;
    this.emit({ t: 'hit', target: target.uid, src: src?.uid, dmg: d - blocked, blocked, guarded });
    if (src?.side === 'ally' && target.side === 'enemy') this.damageDealt += loss;
    if (d - blocked > 0 && target.st.sleep) {
      delete target.st.sleep;
      this.emit({ t: 'text', target: target.uid, text: 'Woke up!' });
    }
    if (target.side === 'enemy' && d - blocked > 0 && target.hp > 0) ENEMIES[target.id].onHurt?.(target, this, d - blocked);
    if (src && !src.dead && opts.contact !== false && target.st.static && src.side !== target.side) {
      this.emit({ t: 'text', target: src.uid, text: 'Zap!', color: '#ffe95a' });
      this.loseHp(src, target.st.static);
    }
    if (target.hp <= 0) this.kill(target, { pierce: opts.pierce, fire: opts.fire });
    return loss;
  }

  /** Direct HP loss (ignores block), e.g. burn, self-damage. */
  loseHp(u: Unit, n: number) {
    if (u.dead || n <= 0) return;
    u.hp -= n;
    this.emit({ t: 'hit', target: u.uid, dmg: n, blocked: 0 });
    if (u.hp <= 0) this.kill(u, {});
  }

  kill(u: Unit, how: { pierce?: boolean; fire?: boolean }) {
    if (u.dead) return;
    u.hp = 0;
    if (u.side === 'enemy') {
      if (ENEMIES[u.id].onDeath?.(u, this, how)) return;
      u.dead = true;
      u.block = 0;
      u.st = {};
      this.emit({ t: 'die', target: u.uid });
      if (u.mem.stolen) {
        this.stolen -= u.mem.stolen;
        this.emit({ t: 'text', target: u.uid, text: `+${u.mem.stolen} coins back`, color: '#ffd84a' });
        u.mem.stolen = 0;
      }
      if (this.powers.kaboom) {
        const n = this.powers.kaboom;
        for (const e of this.livingEnemies()) this.attack(undefined, e, n, { pierce: true }, false);
      }
      return;
    }
    if (u.uid === 'mario') {
      const slot = this.items.indexOf('lifeshroom');
      if (slot >= 0) {
        this.items[slot] = null;
        u.hp = Math.ceil(u.maxHp * 0.3);
        this.emit({ t: 'revive', target: u.uid });
        this.emit({ t: 'text', target: u.uid, text: 'Life Shroom!', color: '#7dff8a' });
        return;
      }
    }
    u.dead = true;
    u.block = 0;
    u.st = {};
    this.emit({ t: 'die', target: u.uid });
  }

  gainBlock(u: Unit, n: number) {
    if (u.dead || n <= 0) return;
    u.block += n;
    this.emit({ t: 'block', target: u.uid, n });
  }

  heal(u: Unit, n: number) {
    if (u.dead || n <= 0) return;
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + n);
    if (u.hp > before) this.emit({ t: 'heal', target: u.uid, n: u.hp - before });
  }

  /** Revive a KO'd partner at `pct` of max HP. */
  revive(u: Unit, pct: number) {
    if (!u.dead || u.side !== 'ally') return;
    u.dead = false;
    u.hp = Math.max(1, Math.ceil(u.maxHp * pct));
    this.emit({ t: 'revive', target: u.uid });
  }

  isImmune(u: Unit, id: StatusId): boolean {
    if ((id === 'dizzy' || id === 'sleep') && u.traits.some((t) => STUN_IMMUNE_TRAITS.includes(t))) return true;
    if (u.uid === 'mario' && id === 'burn' && this.has('fireShield')) return true;
    if (u.side === 'ally' && id === 'shrunk' && this.has('feelingFine')) return true;
    return false;
  }

  applyStatus(u: Unit, id: StatusId, n: number) {
    if (u.dead || n === 0) return;
    if (this.isImmune(u, id)) {
      this.emit({ t: 'text', target: u.uid, text: 'Immune!' });
      return;
    }
    u.st[id] = (u.st[id] ?? 0) + n;
    if ((u.st[id] ?? 0) <= 0) delete u.st[id];
    this.emit({ t: 'status', target: u.uid, id, n });
    if (id === 'sleep' || id === 'dizzy') this.emit({ t: 'text', target: u.uid, text: id === 'sleep' ? 'Asleep!' : 'Dizzy!' });
  }

  removeDebuffs(u: Unit) {
    for (const id of ['shrunk', 'soft', 'burn', 'dizzy', 'sleep', 'chill'] as StatusId[]) delete u.st[id];
    this.emit({ t: 'status', target: u.uid, id: 'soft', n: 0 });
  }

  private dec(u: Unit, id: StatusId) {
    const v = (u.st[id] ?? 0) - 1;
    if (v <= 0) delete u.st[id];
    else u.st[id] = v;
  }

  private tickDurations(u: Unit) {
    for (const id of DURATION) if (u.st[id]) this.dec(u, id);
  }

  private tickBurn(u: Unit) {
    const b = u.st.burn;
    if (!b) return;
    this.emit({ t: 'text', target: u.uid, text: 'Burn!', color: '#ff9a3c' });
    this.loseHp(u, b);
    if (!u.dead) this.dec(u, 'burn');
  }

  private tickRegen(u: Unit) {
    const r = u.st.regen;
    if (!r) return;
    this.heal(u, r);
    this.dec(u, 'regen');
  }

  // ---------- enemies helpers for defs ----------

  summon(id: string): Unit | null {
    return this.addEnemy(id, true);
  }

  flee(u: Unit) {
    u.dead = true;
    u.mem.fled = true;
    this.emit({ t: 'flee', target: u.uid });
  }

  steal(u: Unit, n: number) {
    const got = Math.min(n, Math.max(0, this.run.coins - this.stolen));
    if (got <= 0) return;
    this.stolen += got;
    u.mem.stolen = (u.mem.stolen ?? 0) + got;
    this.emit({ t: 'coins', n: -got });
    this.emit({ t: 'text', target: 'mario', text: `-${got} coins!`, color: '#ffd84a' });
  }

  /** Puts a status/curse card into the draw pile. */
  addCardToDraw(id: string) {
    const inst: CardInst = { uid: `t${this.uidN++}`, id, up: false };
    this.drawPile.splice(this.rng.int(0, this.drawPile.length), 0, inst);
    this.emit({ t: 'cards' });
  }

  addCardToHand(id: string, up = false, free = false): CardInst {
    const inst: CardInst = { uid: `t${this.uidN++}`, id, up, free: free || undefined };
    if (this.hand.length < HAND_MAX) this.hand.push(inst);
    else this.discard.push(inst);
    this.emit({ t: 'cards' });
    return inst;
  }

  // ---------- items & star powers ----------

  canUseItem(slot: number): boolean {
    return this.phase === 'player' && !!this.items[slot];
  }

  itemTargets(slot: number): Unit[] {
    const id = this.items[slot];
    if (!id) return [];
    const d = ITEMS[id];
    if (d.target === 'ally') return this.livingAllies();
    if (d.target === 'enemy') return this.livingEnemies();
    if (d.target === 'koPartner') return this.allies.filter((a) => a.dead && a.uid !== 'mario');
    return [];
  }

  useItem(slot: number, targetUid?: string): boolean {
    const id = this.items[slot];
    if (!id || this.phase !== 'player') return false;
    const d = ITEMS[id];
    let target: Unit | undefined;
    if (d.target !== 'none') {
      target = this.itemTargets(slot).find((u) => u.uid === targetUid);
      if (!target) return false;
    }
    this.items[slot] = null;
    d.use(this, target);
    if (this.has('refund')) {
      this.run.coins += 5;
      this.emit({ t: 'coins', n: 5 });
    }
    this.checkEnd();
    return true;
  }

  canUseSpecial(id: string): boolean {
    return this.phase === 'player' && this.star >= SPECIALS[id].cost && this.livingEnemies().length > 0;
  }

  useSpecial(id: string): boolean {
    if (!this.canUseSpecial(id)) return false;
    this.star -= SPECIALS[id].cost;
    this.emit({ t: 'star', n: -SPECIALS[id].cost });
    SPECIALS[id].use(this);
    this.checkEnd();
    return true;
  }

  // ---------- end ----------

  isOver(): boolean {
    return this.phase === 'over';
  }

  checkEnd(): boolean {
    if (this.phase === 'over') return true;
    if (this.mario.dead) {
      this.phase = 'over';
      this.result = 'lose';
      return true;
    }
    // Win when every non-minion foe is down; leftover minions run off.
    if (!this.enemies.some((e) => !e.dead && !e.traits.includes('minion'))) {
      for (const e of this.livingEnemies()) this.flee(e);
      for (const e of this.enemies) if (e.mem.revive) delete e.mem.revive;
      this.phase = 'over';
      this.result = 'win';
      return true;
    }
    return false;
  }

  /** Partner unit for a partner id, if on the field. */
  partner(id: PartnerId): Unit | undefined {
    return this.allies.find((u) => u.id === id);
  }
}
