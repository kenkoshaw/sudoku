import { h, formatTime } from './dom';
import { load, save } from './storage';
import { generate, PEERS, type Difficulty, type Grid } from './engine';
import { dailyPuzzle, dailyDifficulty, formatDay } from './daily';
import { cellPoints, groupBonus, digitBonus, winBonus } from './score';
import { recordWin, recordLoss, getProgress } from './progress';
import { THEMES, modeToggle } from './themes';
import { sound, floatText, confetti, toast } from './fx';
import { createWheel, type WheelState } from './wheel';

export const MAX_MISTAKES = 3;
export const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const levelName = (d: Difficulty) => d[0].toUpperCase() + d.slice(1);

type Status = 'playing' | 'won' | 'lost';

export interface State {
  mode: 'classic' | 'daily';
  date: string | null;
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[]; // bitmask per cell
  elapsed: number;
  lastPlaced: number; // elapsed ms at last correct entry, for the speed bonus
  mistakes: number;
  score: number;
  secondChanceUsed: boolean;
  status: Status;
}

interface Snapshot {
  i: number;
  value: number;
  notes: number[];
}

const KEY = { classic: 'game:classic', daily: 'game:daily' } as const;

function freshState(mode: State['mode'], difficulty: Difficulty, date: string | null): State {
  const { puzzle, solution } = date ? dailyPuzzle(date) : generate(difficulty);
  return {
    mode, date, difficulty, puzzle, solution,
    values: puzzle.slice(), notes: new Array(81).fill(0),
    elapsed: 0, lastPlaced: 0, mistakes: 0, score: 0, secondChanceUsed: false, status: 'playing',
  };
}

const hasMoves = (s: State) => s.values.some((v, i) => v && !s.puzzle[i]);

/** The saved classic game, if one is in progress. */
export function classicInProgress(): State | null {
  const s = load<State | null>(KEY.classic, null);
  return s && s.status === 'playing' && hasMoves(s) ? s : null;
}

/** Start a new classic game, counting any unfinished one as a loss. */
export function startClassic(level: Difficulty): void {
  const prev = load<State | null>(KEY.classic, null);
  if (prev && prev.status === 'playing' && hasMoves(prev)) recordLoss(prev.difficulty);
  save(KEY.classic, freshState('classic', level, null));
}

const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  erase: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21z"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  notes: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  auto: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
};

export function icon(paths: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = paths;
  return svg;
}

const row = (i: number) => Math.floor(i / 9);
const col = (i: number) => i % 9;
const GROUPS = [
  (i: number) => Array.from({ length: 9 }, (_, k) => row(i) * 9 + k),
  (i: number) => Array.from({ length: 9 }, (_, k) => k * 9 + col(i)),
  (i: number) => {
    const r0 = Math.floor(row(i) / 3) * 3, c0 = Math.floor(col(i) / 3) * 3;
    return Array.from({ length: 9 }, (_, k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3));
  },
];

export interface GameOptions {
  mode: 'classic' | 'daily';
  date?: string;
}

export function mount(root: HTMLElement, opts: GameOptions): () => void {
  let state: State;
  if (opts.mode === 'daily' && opts.date) {
    const saved = load<State | null>(KEY.daily, null);
    state = saved && saved.date === opts.date && saved.status !== 'won' ? saved : freshState('daily', dailyDifficulty(opts.date), opts.date);
  } else {
    state = load<State | null>(KEY.classic, null) ?? freshState('classic', 'easy', null);
  }

  let selected = -1;
  let notesMode = false;
  let paused = false;
  let started = Date.now();
  let history: Snapshot[] = [];

  /* ---------- DOM ---------- */

  const title = state.mode === 'daily' && state.date
    ? `Daily · ${formatDay(state.date)}`
    : levelName(state.difficulty);
  const pauseBtn = h('button', { class: 'icon-btn', 'aria-label': 'Pause', onclick: () => setPaused(true) }, icon(ICONS.pause));
  const header = h('header', { class: 'game-head' },
    h('a', { class: 'back', href: state.mode === 'daily' ? '#/daily' : '#/', 'aria-label': 'Back' }, '‹'),
    h('h1', {}, title),
    modeToggle(),
    pauseBtn,
  );

  const livesEl = h('span', { class: 'lives' });
  const scoreEl = h('b', {}, '0');
  const timeEl = h('b', {}, formatTime(state.elapsed));
  const info = h('div', { class: 'sd-info' },
    h('div', {}, 'Mistakes', livesEl),
    h('div', { class: 'center' }, 'Score', scoreEl),
    h('div', {}, 'Time', timeEl),
  );

  const board = h('div', { class: 'sudoku', role: 'grid' });
  const cells = Array.from({ length: 81 }, (_, i) =>
    h('div', { class: 'cell', role: 'gridcell', onpointerdown: (e: Event) => press(i, e as PointerEvent) }),
  );
  board.append(...cells);
  const pauseCover = h('button', { class: 'pause-cover hidden', onclick: () => setPaused(false) },
    h('span', { class: 'play-circle' }, '▶'), h('span', {}, 'Paused · tap to resume'));
  const boardWrap = h('div', { class: 'board-wrap' }, board, pauseCover);
  const wheel = createWheel(boardWrap, (d) => enter(d), () => {});

  const tool = (label: string, svg: string, onclick: () => void, badge?: HTMLElement) =>
    h('button', { class: 'sd-tool', onclick }, h('span', { class: 'ring' }, icon(svg), badge ?? null), label);
  const notesBadge = h('span', { class: 'badge' }, 'OFF');
  const notesBtn = tool('Notes', ICONS.notes, toggleNotes, notesBadge);
  const tools = h('div', { class: 'sd-tools' },
    tool('Undo', ICONS.undo, undo),
    tool('Erase', ICONS.erase, erase),
    notesBtn,
    tool('Auto notes', ICONS.auto, autoNotes),
  );

  const pad = h('div', { class: 'pad' });
  for (let d = 1; d <= 9; d++) pad.append(h('button', { 'data-d': d, onclick: () => enter(d) }, String(d)));

  const modal = h('div', { class: 'modal hidden', role: 'dialog' });

  root.append(header, h('div', { class: 'sudoku-wrap' }, info, boardWrap, tools, pad), modal);

  /* ---------- Helpers ---------- */

  function currentElapsed(): number {
    return state.status !== 'playing' || paused ? state.elapsed : state.elapsed + (Date.now() - started);
  }

  function bank(): void {
    state.elapsed = currentElapsed();
    started = Date.now();
  }

  function persist(): void {
    save(KEY[state.mode], { ...state, elapsed: currentElapsed() });
  }

  const isCorrect = (i: number) => state.values[i] === state.solution[i];
  const editable = (i: number) => !state.puzzle[i] && !isCorrect(i);

  function doneDigits(): Set<number> {
    const counts = new Array(10).fill(0);
    state.values.forEach((v, i) => { if (v && v === state.solution[i]) counts[v]++; });
    return new Set(counts.flatMap((c, d) => (d && c === 9 ? [d] : [])));
  }

  function wheelState(): WheelState {
    return { notesMode, notes: state.notes[selected] ?? 0, value: selected >= 0 && !isCorrect(selected) ? state.values[selected] : 0, done: doneDigits() };
  }

  function cellCentre(i: number): [number, number, number] {
    const c = cells[i];
    return [c.offsetLeft + c.offsetWidth / 2, c.offsetTop + c.offsetHeight / 2, c.offsetWidth];
  }

  /* ---------- Actions ---------- */

  function select(i: number): void {
    if (state.status !== 'playing' || paused) return;
    selected = i;
    wheel.close();
    render();
  }

  const HOLD_MS = 120;

  /**
   * Tap a cell to select it. Hold it (or start sliding) to open the wheel,
   * slide towards a digit and let go to enter it. Letting go in the middle cancels.
   */
  function press(i: number, e: PointerEvent): void {
    if (e.button > 0) return;
    select(i);
    if (state.status !== 'playing' || paused || !editable(i)) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const openWheel = () => {
      if (wheel.isOpen || selected !== i) return;
      const [x, y, size] = cellCentre(i);
      wheel.open(x, y, size, wheelState());
    };
    const timer = window.setTimeout(openWheel, HOLD_MS);
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) { moved = true; openWheel(); }
      if (wheel.isOpen) wheel.track(ev.clientX, ev.clientY);
    };
    const end = (ev: PointerEvent) => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!wheel.isOpen) return; // a tap: the cell is just selected
      const d = ev.type === 'pointerup' ? wheel.track(ev.clientX, ev.clientY) : 0;
      if (d) enter(d);
      wheel.close();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function toggleNotes(): void {
    notesMode = !notesMode;
    render();
    if (wheel.isOpen) wheel.update(wheelState());
  }

  function snapshot(i: number): void {
    history.push({ i, value: state.values[i] ?? 0, notes: state.notes.slice() });
    if (history.length > 300) history.shift();
  }

  function enter(d: number): void {
    if (state.status !== 'playing' || paused || selected < 0 || !editable(selected)) return;
    const i = selected;
    if (notesMode) {
      snapshot(i);
      state.values[i] = 0;
      state.notes[i] ^= 1 << d;
      sound.note();
      persist();
      render();
      wheel.update(wheelState());
      return;
    }
    if (state.values[i] === d) return;
    snapshot(i);
    state.values[i] = d;
    state.notes[i] = 0;
    wheel.close();
    if (d === state.solution[i]) {
      for (const p of PEERS[i]) state.notes[p] &= ~(1 << d);
      reward(i);
    } else {
      state.mistakes++;
      sound.error();
      cells[i].animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 240, iterations: 1 },
      );
      if (state.mistakes >= MAX_MISTAKES) lose();
    }
    persist();
    render();
  }

  function erase(): void {
    if (state.status !== 'playing' || selected < 0 || !editable(selected)) return;
    if (!state.values[selected] && !state.notes[selected]) return;
    snapshot(selected);
    state.values[selected] = 0;
    state.notes[selected] = 0;
    persist();
    render();
    if (wheel.isOpen) wheel.update(wheelState());
  }

  function undo(): void {
    const last = history.pop();
    if (!last || state.status !== 'playing') return;
    if (last.i >= 0 && !isCorrect(last.i)) state.values[last.i] = last.value;
    state.notes = last.notes;
    if (last.i >= 0) selected = last.i;
    wheel.close();
    persist();
    render();
  }

  /** Fill every empty cell with the digits still possible there. */
  function autoNotes(): void {
    if (state.status !== 'playing' || paused) return;
    snapshot(-1);
    for (let i = 0; i < 81; i++) {
      if (state.values[i]) continue;
      let mask = 0x3fe;
      for (const p of PEERS[i]) if (state.values[p] && isCorrect(p)) mask &= ~(1 << state.values[p]);
      state.notes[i] = mask;
    }
    sound.note();
    persist();
    render();
  }

  function setPaused(on: boolean): void {
    if (state.status !== 'playing' || paused === on) return;
    bank();
    paused = on;
    wheel.close();
    pauseCover.classList.toggle('hidden', !on);
    board.classList.toggle('paused', on);
    persist();
  }

  /* ---------- Scoring and celebration ---------- */

  function reward(i: number): void {
    const now = currentElapsed();
    const pts = cellPoints(state.difficulty, (now - state.lastPlaced) / 1000);
    state.lastPlaced = now;
    let total = pts;

    if (state.values.every((v, k) => v === state.solution[k])) {
      state.score += total;
      win(i);
      return;
    }

    const wave = new Map<number, number>();
    let groups = 0;
    for (const g of GROUPS) {
      const group = g(i);
      if (!group.every(isCorrect)) continue;
      groups++;
      for (const k of group) {
        const dist = Math.max(Math.abs(row(k) - row(i)), Math.abs(col(k) - col(i)));
        wave.set(k, Math.min(wave.get(k) ?? Infinity, dist * 55));
      }
    }
    const d = state.solution[i];
    const digitDone = state.values.filter((v, k) => v === d && isCorrect(k)).length === 9;
    if (groups) total += groupBonus(state.difficulty, groups);
    if (digitDone) total += digitBonus(state.difficulty);
    state.score += total;

    const [x, y] = cellCentre(i);
    floatText(boardWrap, x, y, `+${total}`, total > pts);
    if (digitDone) sound.digit();
    else if (groups) sound.group(groups);
    else sound.place();

    requestAnimationFrame(() => {
      for (const [k, delay] of wave) flash(k, delay);
      if (digitDone) state.values.forEach((v, k) => { if (v === d) pop(k, 80 + Math.abs(row(k) - row(i)) * 40); });
    });
    bumpScore();
  }

  function flash(k: number, delay: number): void {
    const colour = getComputedStyle(document.documentElement).getPropertyValue('--sd-flash').trim();
    cells[k].animate([{ backgroundColor: colour, color: '#fff', offset: 0.3 }], { duration: 650, delay, easing: 'ease-out' });
  }

  function pop(k: number, delay: number): void {
    cells[k].firstElementChild?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 500, delay, easing: 'ease-in-out' },
    );
  }

  function bumpScore(): void {
    scoreEl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300 });
  }

  function themeColours(): string[] {
    const cs = getComputedStyle(document.documentElement);
    return ['--sd-user', '--sd-flash', '--accent'].map((v) => cs.getPropertyValue(v).trim()).concat(['#fbbf24', '#f472b6', '#34d399']);
  }

  function win(from: number): void {
    bank();
    state.status = 'won';
    const bonus = winBonus(state.difficulty, state.mistakes);
    state.score += bonus;
    selected = -1;
    wheel.close();
    persist();
    render();
    requestAnimationFrame(() => {
      cells.forEach((_, k) => flash(k, (Math.abs(row(k) - row(from)) + Math.abs(col(k) - col(from))) * 45));
    });
    sound.win();
    const outcome = recordWin({ difficulty: state.difficulty, daily: state.date, time: state.elapsed, mistakes: state.mistakes, score: state.score });
    setTimeout(() => {
      confetti(themeColours());
      showWin(bonus, outcome.newBestTime, outcome.newBestScore, outcome.earned.map((a) => a.id));
      outcome.earned.forEach((a, k) => toast(a.icon, a.name, a.desc, 600 + k * 3400));
    }, 900);
  }

  function lose(): void {
    bank();
    state.status = 'lost';
    wheel.close();
    sound.over();
    setTimeout(showLost, 400);
  }

  /* ---------- Modals ---------- */

  function closeModal(): void {
    modal.classList.add('hidden');
    modal.replaceChildren();
  }

  function openModal(...children: (Node | null)[]): void {
    modal.replaceChildren(h('div', { class: 'modal-card' }, ...children));
    modal.classList.remove('hidden');
  }

  function countUp(el: HTMLElement, to: number): void {
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { el.textContent = to.toLocaleString(); }, 1000);
  }

  function showWin(bonus: number, bestTime: boolean, bestScore: boolean, earnedIds: string[]): void {
    const scoreBig = h('div', { class: 'win-score' }, '0');
    const themes = THEMES.filter((t) => t.unlock && earnedIds.includes(t.unlock));
    const streak = getProgress().levels[state.difficulty].streak;
    openModal(
      h('div', { class: 'win-title' }, 'Solved!'),
      scoreBig,
      h('div', { class: 'muted' }, 'points'),
      h('div', { class: 'win-stats' },
        h('div', {}, h('span', {}, 'Time'), h('b', {}, formatTime(state.elapsed)), bestTime ? h('em', {}, 'Best!') : null),
        h('div', {}, h('span', {}, 'Mistakes'), h('b', {}, `${state.mistakes}/${MAX_MISTAKES}`), state.mistakes === 0 ? h('em', {}, 'Flawless') : null),
        h('div', {}, h('span', {}, 'Win streak'), h('b', {}, `🔥 ${streak}`), bestScore ? h('em', {}, 'Top score') : null),
      ),
      h('div', { class: 'muted small' }, `Includes +${bonus.toLocaleString()} finish bonus${state.mistakes === 0 ? ' (doubled for no mistakes)' : ''}`),
      themes.length ? h('div', { class: 'unlock' }, `🎨 New theme unlocked: ${themes.map((t) => t.name).join(', ')}`) : null,
      h('div', { class: 'btn-row' },
        state.mode === 'daily'
          ? h('a', { class: 'btn', href: '#/daily' }, 'Calendar')
          : h('a', { class: 'btn', href: '#/' }, 'Home'),
        state.mode === 'daily'
          ? h('a', { class: 'btn primary', href: '#/' }, 'Home')
          : h('button', { class: 'btn primary', onclick: () => { startClassic(state.difficulty); location.reload(); } }, 'Next puzzle'),
      ),
    );
    countUp(scoreBig, state.score);
  }

  function showLost(): void {
    const canRetry = !state.secondChanceUsed;
    openModal(
      h('div', { class: 'win-title bad' }, 'Out of mistakes'),
      h('p', { class: 'muted' }, `You made ${MAX_MISTAKES} mistakes. ${canRetry ? 'Take a second chance to keep going.' : 'No second chances left.'}`),
      h('div', { class: 'modal-actions' },
        canRetry ? h('button', { class: 'btn primary', onclick: secondChance }, 'Second chance') : null,
        h('button', { class: 'btn', onclick: restart }, 'Restart this puzzle'),
        state.mode === 'classic'
          ? h('button', { class: 'btn', onclick: () => { recordLoss(state.difficulty); startClassic(state.difficulty); location.reload(); } }, 'New puzzle')
          : h('a', { class: 'btn', href: '#/daily', onclick: () => recordLoss(state.difficulty) }, 'Calendar'),
      ),
    );
  }

  function secondChance(): void {
    // Clear the wrong entries and give one life back.
    state.values = state.values.map((v, i) => (v && v !== state.solution[i] ? 0 : v));
    state.mistakes = MAX_MISTAKES - 1;
    state.secondChanceUsed = true;
    state.status = 'playing';
    started = Date.now();
    closeModal();
    persist();
    render();
  }

  function restart(): void {
    recordLoss(state.difficulty);
    const fresh = state.date ? freshState('daily', state.difficulty, state.date) : { ...freshState('classic', state.difficulty, null), puzzle: state.puzzle, solution: state.solution, values: state.puzzle.slice() };
    state = fresh;
    history = [];
    selected = -1;
    started = Date.now();
    closeModal();
    persist();
    render();
  }

  /* ---------- Render ---------- */

  function render(): void {
    notesBtn.classList.toggle('on', notesMode);
    notesBadge.textContent = notesMode ? 'ON' : 'OFF';
    livesEl.replaceChildren(...Array.from({ length: MAX_MISTAKES }, (_, k) => h('i', { class: k < state.mistakes ? 'lost' : '' })));
    livesEl.setAttribute('aria-label', `${state.mistakes} of ${MAX_MISTAKES} mistakes`);
    scoreEl.textContent = state.score.toLocaleString();
    const selVal = selected >= 0 ? state.values[selected] : 0;
    const peers = new Set(selected >= 0 ? PEERS[selected] : []);
    const done = doneDigits();

    cells.forEach((cell, i) => {
      const v = state.values[i];
      cell.className = 'cell';
      if (state.puzzle[i]) cell.classList.add('given');
      if (peers.has(i)) cell.classList.add('peer');
      if (selVal && v === selVal) cell.classList.add('same');
      if (i === selected) cell.classList.add('sel');
      if (v && v !== state.solution[i]) cell.classList.add('err');
      if (v) cell.replaceChildren(h('span', {}, String(v)));
      else if (state.notes[i]) {
        const grid = h('div', { class: 'notes' });
        for (let d = 1; d <= 9; d++) {
          const on = state.notes[i] & (1 << d);
          grid.append(h('span', { class: on && d === selVal ? 'hl' : '' }, on ? String(d) : ''));
        }
        cell.replaceChildren(grid);
      } else cell.replaceChildren();
    });
    [...pad.children].forEach((b, k) => {
      b.classList.toggle('done', done.has(k + 1));
      (b as HTMLButtonElement).disabled = done.has(k + 1);
    });
  }

  /* ---------- Lifecycle ---------- */

  const tick = setInterval(() => { timeEl.textContent = formatTime(currentElapsed()); }, 500);

  const onKey = (e: KeyboardEvent) => {
    if (/^[1-9]$/.test(e.key)) enter(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key === 'n') toggleNotes();
    else if (e.key === 'Escape') wheel.close();
    else if (e.key === 'p' || e.key === ' ') { setPaused(!paused); e.preventDefault(); }
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) undo();
    else if (e.key.startsWith('Arrow')) {
      const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [0, 0];
      const from = selected < 0 ? 40 : selected;
      selected = ((row(from) + dr + 9) % 9) * 9 + ((col(from) + dc + 9) % 9);
      wheel.close();
      render();
      e.preventDefault();
    }
  };
  // Leaving the app pauses the game.
  const onHide = () => { if (document.hidden) setPaused(true); };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);

  render();
  if (state.status === 'lost') showLost();
  persist();

  return () => {
    persist();
    clearInterval(tick);
    wheel.close();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
  };
}
