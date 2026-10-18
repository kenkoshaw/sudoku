import { describe, it, expect } from 'vitest';
import { emptyProgress, applyWin, applyLoss } from '../src/progress';
import { cellPoints, winBonus } from '../src/score';

describe('scoring', () => {
  it('speed bonus doubles points at most, nothing after 15s', () => {
    expect(cellPoints('easy', 0)).toBe(20);
    expect(cellPoints('easy', 15)).toBe(10);
    expect(cellPoints('easy', 60)).toBe(10);
    expect(cellPoints('expert', 7.5)).toBe(60);
  });
  it('finish bonus doubles when flawless', () => {
    expect(winBonus('hard', 0)).toBe(2 * winBonus('hard', 1));
  });
});

describe('progress', () => {
  const win = { difficulty: 'easy' as const, daily: null, time: 200_000, mistakes: 0, score: 900 };

  it('first flawless fast win earns the right trophies', () => {
    const p = emptyProgress();
    const out = applyWin(p, win, '2026-10-18');
    expect(out.earned.map((a) => a.id).sort()).toEqual(['first_win', 'flawless', 'speed_easy']);
    expect(out.newBestTime).toBe(true);
    expect(p.levels.easy).toMatchObject({ played: 1, won: 1, streak: 1, bestStreak: 1, flawless: 1, bestTime: 200_000 });
    // Not awarded twice
    expect(applyWin(p, { ...win, time: 400_000 }, '2026-10-18').earned).toEqual([]);
  });

  it('loss resets streak but keeps best streak', () => {
    const p = emptyProgress();
    applyWin(p, win);
    applyWin(p, win);
    applyLoss(p, 'easy');
    expect(p.levels.easy).toMatchObject({ played: 3, won: 2, streak: 0, bestStreak: 2 });
  });

  it('daily wins build the daily streak trophy', () => {
    const p = emptyProgress();
    for (const d of ['2026-10-16', '2026-10-17']) applyWin(p, { ...win, daily: d, mistakes: 1 }, d);
    const out = applyWin(p, { ...win, daily: '2026-10-18', mistakes: 1 }, '2026-10-18');
    expect(out.earned.map((a) => a.id)).toContain('daily_3');
    expect(Object.keys(p.daily)).toHaveLength(3);
  });
});
