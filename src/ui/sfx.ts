/** Small synthesized sound effects (no audio files needed). */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSfx(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, delay = 0, slide = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.1, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(g).connect(a.destination);
  s.start(t);
}

export const sfx = {
  select: () => tone(880, 0.05, 'square', 0.04),
  play: () => tone(520, 0.08, 'triangle', 0.08, 0, 300),
  hit: () => {
    noise(0.12, 0.12);
    tone(180, 0.12, 'square', 0.06, 0, -90);
  },
  bigHit: () => {
    noise(0.25, 0.18);
    tone(120, 0.25, 'sawtooth', 0.07, 0, -60);
  },
  nice: () => {
    tone(784, 0.07, 'square', 0.06);
    tone(1175, 0.12, 'square', 0.06, 0.07);
  },
  guard: () => tone(1046, 0.1, 'triangle', 0.08, 0, 200),
  miss: () => tone(300, 0.15, 'triangle', 0.05, 0, -150),
  block: () => tone(660, 0.08, 'triangle', 0.06),
  heal: () => {
    tone(660, 0.08, 'sine', 0.07);
    tone(880, 0.08, 'sine', 0.07, 0.08);
    tone(1320, 0.12, 'sine', 0.07, 0.16);
  },
  coin: () => {
    tone(988, 0.06, 'square', 0.05);
    tone(1319, 0.18, 'square', 0.05, 0.06);
  },
  jump: () => tone(300, 0.15, 'square', 0.05, 0, 500),
  ko: () => tone(400, 0.4, 'triangle', 0.08, 0, -350),
  star: () => {
    for (let i = 0; i < 4; i++) tone(880 + i * 220, 0.08, 'sine', 0.05, i * 0.05);
  },
  error: () => tone(160, 0.15, 'square', 0.05),
  victory: () => {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((n, i) => tone(n, 0.14, 'square', 0.06, i * 0.11));
  },
  defeat: () => {
    [392, 349, 311, 262].forEach((n, i) => tone(n, 0.25, 'triangle', 0.07, i * 0.22));
  },
  summon: () => tone(200, 0.3, 'sine', 0.06, 0, 400),
};
