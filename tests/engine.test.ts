import { describe, it, expect } from 'vitest';
import { generate, countSolutions, isValidSolution, CLUES, type Difficulty } from '../src/engine';

describe('sudoku generator', () => {
  for (const level of Object.keys(CLUES) as Difficulty[]) {
    it(`${level}: valid solution, puzzle matches it, unique`, () => {
      for (let k = 0; k < 5; k++) {
        const { puzzle, solution } = generate(level);
        expect(isValidSolution(solution)).toBe(true);
        puzzle.forEach((v, i) => { if (v) expect(v).toBe(solution[i]); });
        expect(countSolutions(puzzle, 2)).toBe(1);
        const clues = puzzle.filter(Boolean).length;
        expect(clues).toBeGreaterThanOrEqual(CLUES[level] - 1);
        expect(clues).toBeLessThanOrEqual(CLUES[level] + 8);
      }
    });
  }

  it('detects multiple solutions on empty grid', () => {
    expect(countSolutions(new Array(81).fill(0), 2)).toBe(2);
  });
});
