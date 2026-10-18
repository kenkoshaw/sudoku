import { generate, type Difficulty, type Puzzle } from './engine';
import { mulberry32, seedFromString } from './rng';

/** Local-date key, e.g. 2026-10-18. */
export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

// Sunday first, matching Date.getDay(). Harder towards the weekend.
const BY_WEEKDAY: Difficulty[] = ['medium', 'easy', 'medium', 'medium', 'hard', 'hard', 'expert'];

export function dailyDifficulty(key: string): Difficulty {
  return BY_WEEKDAY[parseKey(key).getDay()];
}

export function dailyPuzzle(key: string): Puzzle {
  return generate(dailyDifficulty(key), mulberry32(seedFromString(`sudoku-daily-${key}`)));
}

/** Consecutive solved days ending today, or ending yesterday if today isn't solved yet. */
export function dailyStreak(solved: Set<string>, today: string): number {
  let day = solved.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (solved.has(day)) { n++; day = addDays(day, -1); }
  return n;
}

export function longestStreak(solved: Set<string>): number {
  let best = 0;
  for (const key of solved) {
    if (solved.has(addDays(key, -1))) continue; // not the start of a run
    let n = 0, day = key;
    while (solved.has(day)) { n++; day = addDays(day, 1); }
    best = Math.max(best, n);
  }
  return best;
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return parseKey(key).toLocaleDateString(undefined, opts);
}
