import { h, formatTime } from './dom';
import { load, save, recordBest } from './storage';
import { generate, PEERS, type Difficulty, type Grid } from './engine';

interface State {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  values: Grid;
  notes: number[]; // bitmask per cell
  elapsed: number;
  mistakes: number;
  done: boolean;
}

interface Snapshot {
  i: number;
  value: number;
  notes: number[];
}

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

const ICONS = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  erase: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21z"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  notes: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  hint: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
};

function icon(paths: string): SVGSVGElement {
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

function fresh(difficulty: Difficulty): State {
  const { puzzle, solution } = generate(difficulty);
  return { difficulty, puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0), elapsed: 0, mistakes: 0, done: false };
}

const row = (i: number) => Math.floor(i / 9);
const col = (i: number) => i % 9;
const GROUPS = {
  row: (i: number) => Array.from({ length: 9 }, (_, k) => row(i) * 9 + k),
  col: (i: number) => Array.from({ length: 9 }, (_, k) => k * 9 + col(i)),
  box: (i: number) => {
    const r0 = Math.floor(row(i) / 3) * 3, c0 = Math.floor(col(i) / 3) * 3;
    return Array.from({ length: 9 }, (_, k) => (r0 + Math.floor(k / 3)) * 9 + c0 + (k % 3));
  },
};

export function mount(root: HTMLElement): () => void {
  let state: State = load<State | null>('state', null) ?? fresh(load<Difficulty>('level', 'easy'));
  let selected = state.values.findIndex((v) => v === 0);
  let notesMode = false;
  let started = Date.now();
  let history: Snapshot[] = [];

  const levels = h('div', { class: 'sd-levels' }, 'Difficulty:');
  for (const lvl of LEVELS) {
    levels.append(h('button', { onclick: () => newGame(lvl) }, lvl[0].toUpperCase() + lvl.slice(1)));
  }
  const levelButtons = [...levels.querySelectorAll('button')];
  const timeEl = h('b', {}, '0:00');
  const mistakesEl = h('b', {}, '0');
  const board = h('div', { class: 'sudoku', role: 'grid' });
  const pad = h('div', { class: 'pad' });
  const message = h('div', { class: 'card center hidden' });

  const tool = (label: string, svg: string, onclick: () => void, badge?: HTMLElement) =>
    h('button', { class: 'sd-tool', onclick }, h('span', { class: 'ring' }, icon(svg), badge ?? null), label);
  const notesBadge = h('span', { class: 'badge' }, 'OFF');
  const notesBtn = tool('Notes', ICONS.notes, () => { notesMode = !notesMode; render(); }, notesBadge);

  const cells = Array.from({ length: 81 }, (_, i) =>
    h('div', { class: 'cell', role: 'gridcell', onclick: () => { selected = i; render(); } }),
  );
  board.append(...cells);
  for (let d = 1; d <= 9; d++) pad.append(h('button', { onclick: () => enter(d) }, String(d)));

  root.append(
    h('div', { class: 'sudoku-wrap' },
      levels,
      h('div', { class: 'sd-info' }, h('div', {}, 'Mistakes', mistakesEl), h('div', {}, 'Time', timeEl)),
      board,
      h('div', { class: 'sd-tools' },
        tool('Undo', ICONS.undo, undo),
        tool('Erase', ICONS.erase, erase),
        notesBtn,
        tool('Hint', ICONS.hint, hint),
      ),
      pad,
      message,
    ),
  );

  function persist(): void {
    save('state', { ...state, elapsed: currentElapsed() });
  }

  function currentElapsed(): number {
    return state.done ? state.elapsed : state.elapsed + (Date.now() - started);
  }

  function newGame(lvl: Difficulty): void {
    if (!state.done && state.values.some((v, i) => v && !state.puzzle[i]) && !confirm('Start a new puzzle? This one will be lost.')) return;
    save('level', lvl);
    state = fresh(lvl);
    started = Date.now();
    history = [];
    selected = state.values.findIndex((v) => v === 0);
    persist();
    render();
  }

  function snapshot(i: number): void {
    history.push({ i, value: state.values[i], notes: state.notes.slice() });
    if (history.length > 200) history.shift();
  }

  function enter(d: number): void {
    if (state.done || selected < 0 || state.puzzle[selected]) return;
    if (state.values[selected] === state.solution[selected]) return; // correct cells are locked
    if (notesMode) {
      if (state.values[selected]) return;
      snapshot(selected);
      state.notes[selected] ^= 1 << d;
    } else {
      if (state.values[selected] === d) return;
      snapshot(selected);
      state.values[selected] = d;
      state.notes[selected] = 0;
      if (d !== state.solution[selected]) state.mistakes++;
      else {
        for (const p of PEERS[selected]) state.notes[p] &= ~(1 << d);
        celebrate(selected);
      }
    }
    persist();
    render();
  }

  function erase(): void {
    if (state.done || selected < 0 || state.puzzle[selected]) return;
    if (state.values[selected] === state.solution[selected]) return;
    if (!state.values[selected] && !state.notes[selected]) return;
    snapshot(selected);
    state.values[selected] = 0;
    state.notes[selected] = 0;
    persist();
    render();
  }

  function undo(): void {
    const last = history.pop();
    if (!last || state.done) return;
    state.values[last.i] = last.value;
    state.notes = last.notes;
    selected = last.i;
    persist();
    render();
  }

  function hint(): void {
    if (state.done) return;
    let i = selected >= 0 && state.values[selected] !== state.solution[selected] ? selected : -1;
    if (i < 0) i = state.values.findIndex((v, k) => v !== state.solution[k]);
    if (i < 0) return;
    snapshot(i);
    state.values[i] = state.solution[i];
    state.notes[i] = 0;
    for (const p of PEERS[i]) state.notes[p] &= ~(1 << state.solution[i]);
    selected = i;
    celebrate(i);
    persist();
    render();
  }

  const isSolved = (cellsIdx: number[]) => cellsIdx.every((k) => state.values[k] === state.solution[k]);

  /** Animate any row, column, box or digit that the correct entry at i just completed. */
  function celebrate(i: number): void {
    if (state.values.every((v, k) => v === state.solution[k])) {
      win(i);
      return;
    }
    const wave = new Map<number, number>(); // cell -> delay ms
    for (const group of [GROUPS.row(i), GROUPS.col(i), GROUPS.box(i)]) {
      if (!isSolved(group)) continue;
      for (const k of group) {
        const dist = Math.max(Math.abs(row(k) - row(i)), Math.abs(col(k) - col(i)));
        wave.set(k, Math.min(wave.get(k) ?? Infinity, dist * 55));
      }
    }
    // Wait for render() so the animation runs on the updated cell classes.
    requestAnimationFrame(() => {
      for (const [k, delay] of wave) flash(k, delay);
      const d = state.solution[i];
      if (state.values.filter((v, k) => v === d && v === state.solution[k]).length === 9) {
        state.values.forEach((v, k) => { if (v === d) pop(k, 80 + Math.abs(row(k) - row(i)) * 40); });
      }
    });
  }

  function flash(k: number, delay: number): void {
    const colour = getComputedStyle(board).getPropertyValue('--sd-flash').trim();
    cells[k].animate(
      [{ backgroundColor: colour, color: '#fff', offset: 0.3 }],
      { duration: 650, delay, easing: 'ease-out' },
    );
  }

  function pop(k: number, delay: number): void {
    cells[k].firstElementChild?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 500, delay, easing: 'ease-in-out' },
    );
  }

  function win(from: number): void {
    state.elapsed = currentElapsed();
    state.done = true;
    selected = -1;
    requestAnimationFrame(() => {
      cells.forEach((_, k) => {
        const dist = Math.abs(row(k) - row(from)) + Math.abs(col(k) - col(from));
        flash(k, dist * 45);
      });
    });
    showWin(true);
  }

  function showWin(fresh: boolean): void {
    const best = fresh ? recordBest(`best:${state.difficulty}`, state.elapsed, false) : false;
    message.replaceChildren(
      h('div', { class: 'big good' }, 'Solved!'),
      h('p', {}, `${formatTime(state.elapsed)} · ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}${best ? ' · new best' : ''}`),
      h('button', { class: 'btn primary', onclick: () => newGame(state.difficulty) }, 'Next puzzle'),
    );
  }

  function render(): void {
    levelButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(LEVELS[i] === state.difficulty)));
    notesBtn.classList.toggle('on', notesMode);
    notesBadge.textContent = notesMode ? 'ON' : 'OFF';
    mistakesEl.textContent = String(state.mistakes);
    message.classList.toggle('hidden', !state.done);
    const selVal = selected >= 0 ? state.values[selected] : 0;
    const peers = new Set(selected >= 0 ? PEERS[selected] : []);
    const counts = new Array(10).fill(0);
    state.values.forEach((v, i) => { if (v && v === state.solution[i]) counts[v]++; });

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
    [...pad.children].forEach((b, i) => b.classList.toggle('done', counts[i + 1] === 9));
  }

  const tick = setInterval(() => { timeEl.textContent = formatTime(currentElapsed()); }, 500);

  const onKey = (e: KeyboardEvent) => {
    if (/^[1-9]$/.test(e.key)) enter(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
    else if (e.key === 'n') { notesMode = !notesMode; render(); }
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) undo();
    else if (e.key.startsWith('Arrow') && selected >= 0) {
      const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [0, 0];
      selected = ((row(selected) + dr + 9) % 9) * 9 + ((col(selected) + dc + 9) % 9);
      render();
      e.preventDefault();
    }
  };
  // While hidden the clock is paused: elapsed is banked on hide, and restarts on show.
  const onHide = () => {
    if (document.hidden) { persist(); state.elapsed = currentElapsed(); started = Date.now(); }
    else started = Date.now();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);

  if (state.done) showWin(false);
  render();

  return () => {
    persist();
    clearInterval(tick);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHide);
  };
}
