import type { Difficulty } from './engine';
import type { Progress, WinResult } from './progress';
import { dailyStreak } from './daily';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  earned(p: Progress, last: WinResult | null, today: string): boolean;
}

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
const wins = (p: Progress) => LEVELS.reduce((n, l) => n + p.levels[l].won, 0);
const under = (l: Difficulty, s: number) => (_: Progress, r: WinResult | null) => !!r && r.difficulty === l && r.time < s * 1000;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'First Solve', desc: 'Solve your first puzzle', icon: '🎉', earned: (p) => wins(p) >= 1 },
  { id: 'flawless', name: 'Flawless', desc: 'Solve without a mistake', icon: '💎', earned: (_, r) => !!r && r.mistakes === 0 },
  { id: 'all_levels', name: 'Well-Rounded', desc: 'Solve one at every level', icon: '🧭', earned: (p) => LEVELS.every((l) => p.levels[l].won > 0) },
  { id: 'speed_easy', name: 'Quick Start', desc: 'Solve Easy in under 5 minutes', icon: '⚡', earned: under('easy', 300) },
  { id: 'speed_medium', name: 'Swift', desc: 'Solve Medium in under 8 minutes', icon: '🏃', earned: under('medium', 480) },
  { id: 'speed_hard', name: 'Lightning', desc: 'Solve Hard in under 12 minutes', icon: '🌩️', earned: under('hard', 720) },
  { id: 'expert_win', name: 'Expert', desc: 'Solve an Expert puzzle', icon: '🧠', earned: (p) => p.levels.expert.won > 0 },
  { id: 'expert_flawless', name: 'Grandmaster', desc: 'Solve Expert without a mistake', icon: '👑', earned: (_, r) => !!r && r.difficulty === 'expert' && r.mistakes === 0 },
  { id: 'wins_10', name: 'Regular', desc: 'Solve 10 puzzles', icon: '🔟', earned: (p) => wins(p) >= 10 },
  { id: 'wins_50', name: 'Devoted', desc: 'Solve 50 puzzles', icon: '🏅', earned: (p) => wins(p) >= 50 },
  { id: 'wins_100', name: 'Centurion', desc: 'Solve 100 puzzles', icon: '🏆', earned: (p) => wins(p) >= 100 },
  { id: 'streak_5', name: 'On a Roll', desc: 'Win 5 in a row at one level', icon: '🔥', earned: (p) => LEVELS.some((l) => p.levels[l].bestStreak >= 5) },
  { id: 'daily_1', name: 'Daily Habit', desc: 'Solve a daily challenge', icon: '📅', earned: (p) => Object.keys(p.daily).length >= 1 },
  { id: 'daily_3', name: 'Three-Peat', desc: '3-day daily streak', icon: '🌱', earned: (p, _, t) => dailyStreak(new Set(Object.keys(p.daily)), t) >= 3 },
  { id: 'daily_7', name: 'Week Warrior', desc: '7-day daily streak', icon: '🌿', earned: (p, _, t) => dailyStreak(new Set(Object.keys(p.daily)), t) >= 7 },
  { id: 'daily_30', name: 'Unstoppable', desc: '30-day daily streak', icon: '🌳', earned: (p, _, t) => dailyStreak(new Set(Object.keys(p.daily)), t) >= 30 },
  { id: 'score_10k', name: 'High Roller', desc: 'Earn 10,000 points in total', icon: '💰', earned: (p) => p.totalScore >= 10_000 },
];
