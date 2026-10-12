import type { RunState } from '../engine/types';

/** Star Levels: optional difficulty, unlocked one at a time by winning. Each level keeps every rule below it. */
export const LEVELS: string[] = [
  'Elites have 20% more HP.',
  'Normal enemies have 15% more HP.',
  'Mario starts with 5 less max HP.',
  'Bosses have 15% more HP.',
  'Rest sites heal 25% less.',
  'Enemies start each battle with 1 Strength.',
  'Start with a Haunted curse in your deck.',
  'Shops cost 15% more.',
  'Elites and bosses start with 2 more Strength.',
  'Bosses enter their second phase at 65% HP.',
];
export const MAX_LEVEL = LEVELS.length;

/** A run's Star Level (saves from before the ladder map Hard mode to level 4). */
export function starLevel(run: RunState): number {
  return run.level ?? (run.hard ? 4 : 0);
}
