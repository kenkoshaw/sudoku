import type { Difficulty } from './engine';

export const BASE: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 30, expert: 40 };

/** Points for one correct cell: up to double for placing it within 15s of the previous one. */
export function cellPoints(d: Difficulty, secondsSinceLast: number): number {
  const speed = Math.min(1, Math.max(0, (15 - secondsSinceLast) / 15));
  return Math.round(BASE[d] * (1 + speed));
}

/** Bonus for each row, column or box completed by a move. */
export const groupBonus = (d: Difficulty, groups: number) => BASE[d] * 3 * groups;

/** Bonus for placing the ninth of a digit. */
export const digitBonus = (d: Difficulty) => BASE[d] * 2;

/** Finish bonus, doubled for a flawless solve. */
export const winBonus = (d: Difficulty, mistakes: number) => BASE[d] * 10 * (mistakes === 0 ? 2 : 1);
