import { describe, it, expect } from 'vitest';
import { dailyPuzzle, dailyStreak, longestStreak, addDays, dateKey } from '../src/daily';
import { countSolutions } from '../src/engine';

describe('daily', () => {
  it('same date gives the same unique puzzle; different dates differ', () => {
    const a = dailyPuzzle('2026-10-18'), b = dailyPuzzle('2026-10-18'), c = dailyPuzzle('2026-10-19');
    expect(a.puzzle).toEqual(b.puzzle);
    expect(a.puzzle).not.toEqual(c.puzzle);
    expect(countSolutions(a.puzzle, 2)).toBe(1);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('streak counts back from today, or from yesterday if today is open', () => {
    const s = new Set(['2026-10-15', '2026-10-16', '2026-10-17']);
    expect(dailyStreak(s, '2026-10-18')).toBe(3);
    s.add('2026-10-18');
    expect(dailyStreak(s, '2026-10-18')).toBe(4);
    expect(dailyStreak(s, '2026-10-20')).toBe(0);
  });

  it('longest streak finds the best run', () => {
    expect(longestStreak(new Set(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07']))).toBe(3);
    expect(longestStreak(new Set())).toBe(0);
  });
});
