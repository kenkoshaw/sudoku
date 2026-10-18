const PREFIX = 'sudoku:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress just isn't kept */
  }
}

/** Store value if it beats the current best. Returns true when it is a new best. */
export function recordBest(key: string, value: number, higherIsBetter = true): boolean {
  const best = load<number | null>(key, null);
  const isBest = best === null || (higherIsBetter ? value > best : value < best);
  if (isBest) save(key, value);
  return isBest;
}
