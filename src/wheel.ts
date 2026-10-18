import { h } from './dom';

export interface WheelState {
  notesMode: boolean;
  notes: number; // bitmask of notes in the cell
  value: number; // current (wrong) value in the cell, 0 if empty
  done: Set<number>; // digits already fully placed
}

export interface Wheel {
  open(cx: number, cy: number, cellSize: number, state: WheelState): void;
  update(state: WheelState): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * Radial 1–9 picker that opens around the tapped cell.
 * `container` must be position: relative; coordinates are relative to it.
 */
export function createWheel(container: HTMLElement, onPick: (d: number) => void, onClose: () => void): Wheel {
  const centre = h('div', { class: 'wheel-centre' });
  const buttons = Array.from({ length: 9 }, (_, k) =>
    h('button', {
      class: 'wheel-digit',
      'aria-label': `Enter ${k + 1}`,
      onclick: (e: Event) => { e.stopPropagation(); if (!(e.currentTarget as HTMLButtonElement).disabled) onPick(k + 1); },
    }, String(k + 1)),
  );
  const el = h('div', { class: 'wheel hidden', role: 'dialog', 'aria-label': 'Choose a number' }, h('div', { class: 'wheel-ring' }), centre, ...buttons);
  container.append(el);
  let open = false;

  const onOutside = (e: PointerEvent) => {
    if (!el.contains(e.target as Node)) close();
  };

  function update(s: WheelState): void {
    el.classList.toggle('notes', s.notesMode);
    centre.textContent = s.value ? String(s.value) : '';
    buttons.forEach((b, k) => {
      const d = k + 1;
      b.disabled = s.done.has(d);
      b.classList.toggle('on', s.notesMode && !!(s.notes & (1 << d)));
    });
  }

  function place(cx: number, cy: number, cell: number): void {
    const radius = cell * 1.38; // digit orbit
    const size = Math.max(30, cell * 0.95);
    const outer = radius + size / 2 + 6;
    // Keep the ring on screen horizontally; it may overhang the board edge a little.
    const minX = outer - 14, maxX = container.clientWidth - outer + 14;
    const x = Math.min(maxX, Math.max(minX, cx));
    el.style.left = `${x - outer}px`;
    el.style.top = `${cy - outer}px`;
    el.style.width = el.style.height = `${outer * 2}px`;
    el.style.setProperty('--hole', `${radius - size / 2 - 4}px`);
    el.style.setProperty('--cell', `${cell}px`);
    centre.style.left = `${cx - x + outer}px`;
    centre.style.top = `${outer}px`;
    buttons.forEach((b, k) => {
      const a = (k / 9) * Math.PI * 2 - Math.PI / 2; // 1 at the top, clockwise
      b.style.width = b.style.height = `${size}px`;
      b.style.left = `${outer + Math.cos(a) * radius - size / 2}px`;
      b.style.top = `${outer + Math.sin(a) * radius - size / 2}px`;
    });
  }

  function openAt(cx: number, cy: number, cell: number, s: WheelState): void {
    place(cx, cy, cell);
    update(s);
    el.classList.remove('hidden');
    if (!open) {
      el.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
      // Defer so the tap that opened the wheel doesn't immediately close it.
      setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
    }
    open = true;
  }

  function close(): void {
    if (!open) return;
    open = false;
    el.classList.add('hidden');
    document.removeEventListener('pointerdown', onOutside, true);
    onClose();
  }

  return {
    open: openAt,
    update,
    close,
    get isOpen() { return open; },
  };
}
