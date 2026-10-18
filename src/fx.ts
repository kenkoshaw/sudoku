import { getSettings } from './settings';

/* ---------- Sound: tiny synth, no audio files ---------- */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!getSettings().sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sound = {
  place: () => tone(660, 0, 0.09, 'triangle', 0.05),
  note: () => tone(880, 0, 0.05, 'sine', 0.025),
  error: () => { tone(180, 0, 0.18, 'square', 0.04); tone(140, 0.08, 0.2, 'square', 0.035); },
  group: (n = 1) => [523, 659, 784, 1047].slice(0, 2 + n).forEach((f, k) => tone(f, k * 0.07, 0.22, 'triangle', 0.06)),
  digit: () => [784, 988, 1175].forEach((f, k) => tone(f, k * 0.06, 0.25, 'sine', 0.06)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, k * 0.1, 0.5, 'triangle', 0.07)),
  over: () => [392, 330, 262].forEach((f, k) => tone(f, k * 0.15, 0.35, 'sawtooth', 0.04)),
};

/* ---------- Floating "+120" ---------- */

export function floatText(container: HTMLElement, x: number, y: number, text: string, big = false): void {
  const el = document.createElement('span');
  el.className = 'float-pts' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  container.append(el);
  el.animate(
    [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: 'translate(-50%, -110%) scale(1.1)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 },
    ],
    { duration: big ? 1400 : 1000, easing: 'ease-out' },
  );
  setTimeout(() => el.remove(), big ? 1500 : 1100);
}

/* ---------- Confetti ---------- */

export function confetti(colours: string[], duration = 2600): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  document.body.append(canvas);
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);

  const parts = Array.from({ length: 160 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 15 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.35,
    colour: colours[Math.floor(Math.random() * colours.length)],
  }));

  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = Math.max(0, 1 - Math.max(0, t - duration * 0.6) / (duration * 0.4));
    for (const p of parts) {
      p.vy += 0.38;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.colour;
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/* ---------- Toast for achievements ---------- */

export function toast(icon: string, title: string, sub: string, delay = 0): void {
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast-icon"></span><span><b></b><small></small></span>`;
    (el.querySelector('.toast-icon') as HTMLElement).textContent = icon;
    (el.querySelector('b') as HTMLElement).textContent = title;
    (el.querySelector('small') as HTMLElement).textContent = sub;
    document.body.append(el);
    el.animate(
      [
        { transform: 'translate(-50%, -140%)', opacity: 0 },
        { transform: 'translate(-50%, 0)', opacity: 1, offset: 0.12 },
        { transform: 'translate(-50%, 0)', opacity: 1, offset: 0.85 },
        { transform: 'translate(-50%, -140%)', opacity: 0 },
      ],
      { duration: 3200, easing: 'ease-out' },
    );
    setTimeout(() => el.remove(), 3300);
  }, delay);
}
