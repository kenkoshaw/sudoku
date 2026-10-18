import { h, formatTime } from './dom';
import { save } from './storage';
import { getProgress, emptyProgress, type LevelStats } from './progress';
import { ACHIEVEMENTS } from './achievements';
import { THEMES, applyTheme } from './themes';
import { getSettings, setSetting } from './settings';
import { dateKey, addDays, parseKey, dailyDifficulty, dailyStreak, longestStreak, formatDay } from './daily';
import { classicInProgress, startClassic, LEVELS, levelName } from './game';
import type { Difficulty } from './engine';

const go = (hash: string) => { location.hash = hash; };

function topBar(title: string): HTMLElement {
  return h('header', { class: 'top-bar' },
    h('h1', {}, title),
    h('a', { class: 'icon-link', href: '#/settings', 'aria-label': 'Settings' }, '⚙︎'),
  );
}

/* ---------- Home ---------- */

export function home(root: HTMLElement): void {
  const p = getProgress();
  const today = dateKey();
  const solved = new Set(Object.keys(p.daily));
  const streak = dailyStreak(solved, today);
  const doneToday = solved.has(today);
  const cont = classicInProgress();

  const daily = h('a', { class: 'daily-card', href: `#/daily/${today}` },
    h('div', { class: 'daily-top' },
      h('span', { class: 'daily-label' }, 'Daily Challenge'),
      h('span', { class: 'flame' + (streak ? ' lit' : '') }, `🔥 ${streak}`),
    ),
    h('div', { class: 'daily-date' }, formatDay(today, { weekday: 'long', day: 'numeric', month: 'long' })),
    h('div', { class: 'daily-foot' },
      h('span', {}, levelName(dailyDifficulty(today))),
      h('span', { class: 'daily-cta' }, doneToday ? `Solved ✓ ${p.daily[today].score.toLocaleString()} pts` : streak ? 'Keep your streak going ›' : 'Play ›'),
    ),
  );

  const levels = h('div', { class: 'level-grid' },
    ...LEVELS.map((l) => {
      const best = p.levels[l].bestTime;
      return h('button', {
        class: 'level-btn',
        onclick: () => {
          if (cont && !confirm('Start a new game? Your unfinished game will count as a loss.')) return;
          startClassic(l);
          go('#/play');
        },
      }, h('b', {}, levelName(l)), h('span', {}, best === null ? 'No best yet' : `Best ${formatTime(best)}`));
    }),
  );

  root.append(
    topBar('Sudoku'),
    daily,
    ...(cont
      ? [h('a', { class: 'continue-card', href: '#/play' },
          h('span', {}, h('b', {}, 'Continue'), h('small', {}, `${levelName(cont.difficulty)} · ${formatTime(cont.elapsed)} · ${cont.score.toLocaleString()} pts`)),
          h('span', { class: 'play-circle small' }, '▶'))]
      : []),
    h('h2', {}, 'New game'),
    levels,
    h('div', { class: 'home-total muted' }, `${p.totalScore.toLocaleString()} total points · ${Object.keys(p.achievements).length}/${ACHIEVEMENTS.length} trophies`),
  );
}

/* ---------- Daily calendar ---------- */

export function calendar(root: HTMLElement): void {
  const p = getProgress();
  const today = dateKey();
  const solved = new Set(Object.keys(p.daily));
  let month = parseKey(today);
  month.setDate(1);

  const grid = h('div', { class: 'cal-grid' });
  const label = h('div', { class: 'cal-label' });
  const monthCount = h('div', { class: 'muted center' });
  const prev = h('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => shift(-1) }, '‹');
  const next = h('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => shift(1) }, '›');

  function shift(n: number): void {
    month = new Date(month.getFullYear(), month.getMonth() + n, 1);
    draw();
  }

  function draw(): void {
    label.textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const isCurrent = dateKey(month).slice(0, 7) === today.slice(0, 7);
    next.toggleAttribute('disabled', isCurrent);
    const first = dateKey(month);
    const offset = (month.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let count = 0, avail = 0;
    grid.replaceChildren(
      ...['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => h('span', { class: 'cal-dow' }, d)),
      ...Array.from({ length: offset }, () => h('span')),
      ...Array.from({ length: days }, (_, k) => {
        const key = addDays(first, k);
        const future = key > today;
        const done = solved.has(key);
        if (done) count++;
        if (!future) avail++;
        return h('button', {
          class: 'cal-day' + (done ? ' done' : '') + (key === today ? ' today' : ''),
          disabled: future,
          onclick: () => go(`#/daily/${key}`),
          'aria-label': `${formatDay(key)}${done ? ', solved' : ''}`,
        }, done ? '✓' : String(k + 1));
      }),
    );
    monthCount.textContent = `${count} of ${avail} solved this month`;
  }

  draw();
  root.append(
    topBar('Daily Challenge'),
    h('div', { class: 'streak-row' },
      h('div', { class: 'streak-box' }, h('b', {}, `🔥 ${dailyStreak(solved, today)}`), h('span', {}, 'Current streak')),
      h('div', { class: 'streak-box' }, h('b', {}, `🏆 ${longestStreak(solved)}`), h('span', {}, 'Longest streak')),
    ),
    h('div', { class: 'card' },
      h('div', { class: 'cal-head' }, prev, label, next),
      grid,
      monthCount,
    ),
    h('a', { class: 'btn primary', href: `#/daily/${today}` }, solved.has(today) ? "Replay today's puzzle" : "Play today's puzzle"),
  );
}

/* ---------- Stats ---------- */

export function stats(root: HTMLElement): void {
  const p = getProgress();
  let level: Difficulty | 'all' = 'all';
  const seg = h('div', { class: 'seg' });
  const opts: (Difficulty | 'all')[] = ['all', ...LEVELS];
  opts.forEach((l) => seg.append(h('button', { onclick: () => { level = l; draw(); } }, l === 'all' ? 'All' : levelName(l))));
  const grid = h('div', { class: 'stat-grid' });

  function combine(): LevelStats {
    if (level !== 'all') return p.levels[level];
    const all = Object.values(p.levels);
    return {
      played: all.reduce((n, s) => n + s.played, 0),
      won: all.reduce((n, s) => n + s.won, 0),
      bestTime: null,
      totalWinTime: all.reduce((n, s) => n + s.totalWinTime, 0),
      bestScore: Math.max(0, ...all.map((s) => s.bestScore)),
      streak: Math.max(0, ...all.map((s) => s.streak)),
      bestStreak: Math.max(0, ...all.map((s) => s.bestStreak)),
      flawless: all.reduce((n, s) => n + s.flawless, 0),
    };
  }

  function draw(): void {
    [...seg.children].forEach((b, k) => b.setAttribute('aria-pressed', String(opts[k] === level)));
    const s = combine();
    const tile = (label: string, value: string) => h('div', { class: 'stat' }, h('b', {}, value), h('span', {}, label));
    grid.replaceChildren(
      tile('Played', String(s.played)),
      tile('Won', String(s.won)),
      tile('Win rate', s.played ? `${Math.round((s.won / s.played) * 100)}%` : '–'),
      tile('Best time', s.bestTime === null ? '–' : formatTime(s.bestTime)),
      tile('Average time', s.won ? formatTime(s.totalWinTime / s.won) : '–'),
      tile('Best score', s.bestScore ? s.bestScore.toLocaleString() : '–'),
      tile('Win streak', String(s.streak)),
      tile('Best streak', String(s.bestStreak)),
      tile('Flawless', String(s.flawless)),
    );
  }

  draw();
  const solved = new Set(Object.keys(p.daily));
  root.append(
    topBar('Statistics'),
    seg,
    grid,
    h('div', { class: 'card stat-foot' },
      h('div', {}, h('span', {}, 'Total points'), h('b', {}, p.totalScore.toLocaleString())),
      h('div', {}, h('span', {}, 'Dailies solved'), h('b', {}, String(solved.size))),
      h('div', {}, h('span', {}, 'Daily streak'), h('b', {}, `🔥 ${dailyStreak(solved, dateKey())}`)),
    ),
  );
}

/* ---------- Awards and themes ---------- */

export function awards(root: HTMLElement): void {
  const p = getProgress();
  const current = getSettings().theme;
  const earned = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;

  const themeRow = h('div', { class: 'theme-grid' },
    ...THEMES.map((t) => {
      const unlocked = !t.unlock || !!p.achievements[t.unlock];
      const req = ACHIEVEMENTS.find((a) => a.id === t.unlock);
      return h('button', {
        class: 'theme' + (t.id === current ? ' current' : '') + (unlocked ? '' : ' locked'),
        disabled: !unlocked,
        onclick: () => { setSetting('theme', t.id); applyTheme(t.id); root.replaceChildren(); awards(root); },
      },
        h('span', { class: 'swatch', style: `--a:${t.light.user};--b:${t.light.sel};--c:${t.dark.user}` }),
        h('b', {}, t.name),
        h('small', {}, unlocked ? (t.id === current ? 'In use' : 'Tap to use') : `🔒 ${req?.name ?? ''}`),
      );
    }),
  );

  root.append(
    topBar('Trophies'),
    h('p', { class: 'muted' }, `${earned} of ${ACHIEVEMENTS.length} earned`),
    h('div', { class: 'award-grid' },
      ...ACHIEVEMENTS.map((a) => {
        const at = p.achievements[a.id];
        return h('div', { class: 'award' + (at ? ' got' : '') },
          h('span', { class: 'award-icon' }, a.icon),
          h('b', {}, a.name),
          h('small', {}, a.desc),
        );
      }),
    ),
    h('h2', {}, 'Board themes'),
    themeRow,
  );
}

/* ---------- Settings ---------- */

export function settings(root: HTMLElement): void {
  const s = getSettings();
  const toggle = (on: boolean, onchange: (v: boolean) => void) => {
    const b = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(on) });
    b.addEventListener('click', () => {
      const v = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(v));
      onchange(v);
    });
    return b;
  };
  const inputSeg = h('div', { class: 'seg' },
    h('button', { 'aria-pressed': String(s.input === 'wheel'), onclick: () => { setSetting('input', 'wheel'); redraw(); } }, 'Number wheel'),
    h('button', { 'aria-pressed': String(s.input === 'pad'), onclick: () => { setSetting('input', 'pad'); redraw(); } }, 'Number pad'),
  );
  function redraw(): void { root.replaceChildren(); settings(root); }

  root.append(
    h('header', { class: 'game-head' }, h('a', { class: 'back', href: '#/', 'aria-label': 'Back' }, '‹'), h('h1', {}, 'Settings')),
    h('div', { class: 'card settings' },
      h('div', { class: 'setting' }, h('span', {}, 'Sound effects'), toggle(s.sound, (v) => setSetting('sound', v))),
      h('div', { class: 'setting col' }, h('span', {}, 'Enter numbers with'), inputSeg),
      h('a', { class: 'setting', href: '#/awards' }, h('span', {}, 'Board theme'), h('span', { class: 'muted' }, `${THEMES.find((t) => t.id === s.theme)?.name ?? 'Classic'} ›`)),
    ),
    h('button', {
      class: 'btn danger',
      onclick: () => {
        if (!confirm('Reset all statistics, streaks and trophies? This cannot be undone.')) return;
        save('progress', emptyProgress());
        setSetting('theme', 'classic');
        applyTheme('classic');
        go('#/');
      },
    }, 'Reset progress'),
    h('p', { class: 'muted small center' }, 'Everything is stored on this device only.'),
  );
}
