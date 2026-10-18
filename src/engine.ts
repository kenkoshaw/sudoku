/** Grid: 81 numbers, 0 = empty, row-major. */
export type Grid = number[];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Target clue counts. Generation stops early if no more cells can be removed uniquely. */
export const CLUES: Record<Difficulty, number> = { easy: 40, medium: 33, hard: 28, expert: 24 };

const ALL = 0x3fe; // bits 1..9

const box = (i: number) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);

export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9, b = box(i);
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (Math.floor(j / 9) === r || j % 9 === c || box(j) === b)) out.push(j);
  }
  return out;
});

function popcount(n: number): number {
  let c = 0;
  while (n) { n &= n - 1; c++; }
  return c;
}

/**
 * Count solutions up to `limit`. If `fill` is given, it receives the first solution found.
 * `randomise` shuffles candidate order (used to generate a random full grid).
 */
export function countSolutions(grid: Grid, limit = 2, fill?: Grid, randomise = false): number {
  const g = grid.slice();
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const bit = 1 << v, r = Math.floor(i / 9), c = i % 9, b = box(i);
    if ((rows[r] | cols[c] | boxes[b]) & bit) return 0; // contradictory givens
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  let found = 0;

  const solve = (): boolean => {
    // Pick the empty cell with fewest candidates.
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ALL & ~(rows[Math.floor(i / 9)] | cols[i % 9] | boxes[box(i)]);
      const n = popcount(mask);
      if (n < bestCount) { best = i; bestMask = mask; bestCount = n; if (n <= 1) break; }
    }
    if (best === -1) {
      found++;
      if (fill && found === 1) for (let i = 0; i < 81; i++) fill[i] = g[i];
      return found >= limit;
    }
    if (bestCount === 0) return false;
    const digits: number[] = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
    if (randomise) shuffleInPlace(digits);
    const r = Math.floor(best / 9), c = best % 9, b = box(best);
    for (const d of digits) {
      const bit = 1 << d;
      g[best] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      if (solve()) return true;
      g[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
    }
    return false;
  };

  solve();
  return found;
}

function shuffleInPlace<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

export function randomSolution(): Grid {
  const out = new Array(81).fill(0);
  countSolutions(new Array(81).fill(0), 1, out, true);
  return out;
}

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
}

export function generate(difficulty: Difficulty): Puzzle {
  const solution = randomSolution();
  const puzzle = solution.slice();
  const target = CLUES[difficulty];
  let clues = 81;
  // Remove in symmetric pairs (i, 80 - i) for a classic look.
  const order = Array.from({ length: 41 }, (_, i) => i);
  shuffleInPlace(order);
  for (const i of order) {
    if (clues <= target) break;
    const j = 80 - i;
    const keepI = puzzle[i], keepJ = puzzle[j];
    puzzle[i] = 0; puzzle[j] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[i] = keepI; puzzle[j] = keepJ;
    } else {
      clues -= i === j ? 1 : 2;
    }
  }
  return { puzzle, solution };
}

export function isValidSolution(g: Grid): boolean {
  for (let i = 0; i < 81; i++) {
    if (g[i] < 1 || g[i] > 9) return false;
    for (const p of PEERS[i]) if (g[p] === g[i]) return false;
  }
  return true;
}
