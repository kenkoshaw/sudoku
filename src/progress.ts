import type { Difficulty } from './engine';
import { load, save } from './storage';
import { ACHIEVEMENTS, type Achievement } from './achievements';
import { dateKey } from './daily';

export interface LevelStats {
  played: number;
  won: number;
  bestTime: number | null;
  totalWinTime: number;
  bestScore: number;
  streak: number;
  bestStreak: number;
  flawless: number;
}

export interface DailyRecord {
  time: number;
  score: number;
  mistakes: number;
}

export interface Progress {
  levels: Record<Difficulty, LevelStats>;
  daily: Record<string, DailyRecord>;
  totalScore: number;
  achievements: Record<string, number>; // id -> earned timestamp
}

export interface WinResult {
  difficulty: Difficulty;
  daily: string | null; // date key for daily games
  time: number;
  mistakes: number;
  score: number;
}

const emptyLevel = (): LevelStats => ({ played: 0, won: 0, bestTime: null, totalWinTime: 0, bestScore: 0, streak: 0, bestStreak: 0, flawless: 0 });

export function emptyProgress(): Progress {
  return {
    levels: { easy: emptyLevel(), medium: emptyLevel(), hard: emptyLevel(), expert: emptyLevel() },
    daily: {},
    totalScore: 0,
    achievements: {},
  };
}

export function getProgress(): Progress {
  const p = load<Progress | null>('progress', null);
  if (!p) return emptyProgress();
  const base = emptyProgress();
  for (const l of Object.keys(base.levels) as Difficulty[]) base.levels[l] = { ...base.levels[l], ...p.levels?.[l] };
  return { ...base, ...p, levels: base.levels };
}

const persist = (p: Progress) => save('progress', p);

export interface WinOutcome {
  newBestTime: boolean;
  newBestScore: boolean;
  earned: Achievement[];
}

/** Apply a win to progress and return what it unlocked. Pure apart from `now`/`today`. */
export function applyWin(p: Progress, r: WinResult, today = dateKey(), now = Date.now()): WinOutcome {
  const s = p.levels[r.difficulty];
  s.played++;
  s.won++;
  s.totalWinTime += r.time;
  const newBestTime = s.bestTime === null || r.time < s.bestTime;
  if (newBestTime) s.bestTime = r.time;
  const newBestScore = r.score > s.bestScore;
  if (newBestScore) s.bestScore = r.score;
  s.streak++;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  if (r.mistakes === 0) s.flawless++;
  p.totalScore += r.score;
  if (r.daily) {
    const prev = p.daily[r.daily];
    if (!prev || r.score > prev.score) p.daily[r.daily] = { time: r.time, score: r.score, mistakes: r.mistakes };
  }
  const earned = ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && a.earned(p, r, today));
  for (const a of earned) p.achievements[a.id] = now;
  return { newBestTime, newBestScore, earned };
}

/** A loss or an abandoned game: counts as played, breaks the win streak. */
export function applyLoss(p: Progress, d: Difficulty): void {
  p.levels[d].played++;
  p.levels[d].streak = 0;
}

export function recordWin(r: WinResult): WinOutcome {
  const p = getProgress();
  const out = applyWin(p, r);
  persist(p);
  return out;
}

export function recordLoss(d: Difficulty): void {
  const p = getProgress();
  applyLoss(p, d);
  persist(p);
}
