import { newRun } from '../src/engine/run';
import { autoRun } from './bot';
const starters = ['goombario', 'kooper', 'bombette'] as const;
for (const skill of [0.5, 0.8]) {
  const tally: Record<string, number> = {};
  const deaths: Record<string, number> = {};
  for (let s = 0; s < 200; s++) {
    const run = newRun({ seed: `B${s}`, starter: starters[s % 3] });
    const r = autoRun(run, s, skill);
    const k = `${r.result}@${r.act}`;
    tally[k] = (tally[k] ?? 0) + 1;
    if (r.result === 'lose') {
      const last = r.log[r.log.length - 1] ?? '';
      const m = last.match(/act\d (\w+) \[([^\]]+)\]/);
      if (m) deaths[`${m[1]}:${m[2]}`] = (deaths[`${m[1]}:${m[2]}`] ?? 0) + 1;
    }
  }
  console.log('skill', skill, JSON.stringify(tally));
  console.log(Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v} ${k}`).join('\n'));
}
