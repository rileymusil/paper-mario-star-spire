import type { MapData, MapNode, NodeType } from './types';
import type { Rng } from './rng';

export const MAP_COLS = 7;
const PATHS = 6;

const id = (floor: number, col: number) => `${floor}-${col}`;

/**
 * Branching act map in the Slay the Spire style: several non-crossing paths
 * climb `floors` floors, all converging on a single boss node.
 */
export function generateMap(rng: Rng, floors: number): MapData {
  const nodes: Record<string, MapNode> = {};
  const edges = new Set<string>();
  const starts: string[] = [];
  const ensure = (f: number, c: number) => {
    const k = id(f, c);
    if (!nodes[k]) nodes[k] = { id: k, floor: f, col: c, type: 'battle', next: [], jx: rng.next() - 0.5, jy: rng.next() - 0.5 };
    return nodes[k];
  };
  for (let p = 0; p < PATHS; p++) {
    let col = rng.int(0, MAP_COLS - 1);
    if (p === 1) while (id(1, col) === starts[0]) col = rng.int(0, MAP_COLS - 1);
    const first = ensure(1, col);
    if (!starts.includes(first.id)) starts.push(first.id);
    for (let f = 1; f < floors; f++) {
      const opts = rng.shuffle([-1, 0, 1].map((d) => col + d).filter((c) => c >= 0 && c < MAP_COLS));
      // Moving diagonally must not cross an existing diagonal edge going the other way.
      const next = opts.find((c) => c === col || !edges.has(`${f}:${c}>${f + 1}:${col}`)) ?? col;
      edges.add(`${f}:${col}>${f + 1}:${next}`);
      const a = ensure(f, col);
      const b = ensure(f + 1, next);
      if (!a.next.includes(b.id)) a.next.push(b.id);
      col = next;
    }
  }
  const boss: MapNode = { id: 'boss', floor: floors + 1, col: 3, type: 'boss', next: [], jx: 0, jy: 0 };
  nodes.boss = boss;
  for (const n of Object.values(nodes)) if (n.floor === floors) n.next = ['boss'];
  assignTypes(rng, nodes, floors);
  return { floors, nodes, starts };
}

function parentsOf(nodes: Record<string, MapNode>): Record<string, MapNode[]> {
  const parents: Record<string, MapNode[]> = {};
  for (const n of Object.values(nodes)) for (const k of n.next) (parents[k] ??= []).push(n);
  return parents;
}

function assignTypes(rng: Rng, nodes: Record<string, MapNode>, floors: number) {
  const parents = parentsOf(nodes);
  const list = Object.values(nodes).filter((n) => n.type !== 'boss').sort((a, b) => a.floor - b.floor || a.col - b.col);
  const treasureFloor = Math.ceil(floors * 0.6);
  for (const n of list) {
    if (n.floor === 1) n.type = 'battle';
    else if (n.floor === treasureFloor) n.type = 'treasure';
    else if (n.floor === floors) n.type = 'rest';
    else n.type = rollType(rng, n, parents[n.id] ?? [], floors);
  }
  // One partner node per act, mid-act.
  const mid = list.filter((n) => n.floor >= 4 && n.floor <= 7 && n.floor !== treasureFloor);
  if (mid.length) rng.pick(mid).type = 'partner';
  // Guarantee at least one shop and two elites.
  const eligible = (n: MapNode) => n.type === 'battle' && n.floor >= 4 && n.floor < floors - 1;
  if (!list.some((n) => n.type === 'shop')) {
    const c = list.filter((n) => eligible(n) || (n.type === 'event' && n.floor >= 3));
    if (c.length) rng.pick(c).type = 'shop';
  }
  while (list.filter((n) => n.type === 'elite').length < 2) {
    const c = list.filter(eligible);
    if (!c.length) break;
    rng.pick(c).type = 'elite';
  }
}

function rollType(rng: Rng, n: MapNode, parents: MapNode[], floors: number): NodeType {
  const weights: [NodeType, number][] = [
    ['battle', 45],
    ['event', 24],
    ['elite', n.floor >= 4 ? 11 : 0],
    ['rest', n.floor >= 4 && n.floor < floors - 1 ? 10 : 0],
    ['shop', n.floor >= 3 ? 7 : 0],
  ];
  for (let tries = 0; tries < 10; tries++) {
    const t = rng.weighted(weights.filter(([, w]) => w > 0));
    const repeats = (t === 'elite' || t === 'rest' || t === 'shop') && parents.some((p) => p.type === t);
    if (!repeats) return t;
  }
  return 'battle';
}

/** Nodes the player may step to next. */
export function reachable(map: MapData, pos: string | null): string[] {
  if (!pos) return map.starts;
  return map.nodes[pos]?.next ?? [];
}
