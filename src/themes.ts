import { getSettings, setSetting } from './settings';
import { h } from './dom';

type Palette = Record<'user' | 'peer' | 'same' | 'sel' | 'flash' | 'tool' | 'toolInk' | 'accent', string>;

export interface Theme {
  id: string;
  name: string;
  /** Achievement that unlocks it; null = always available. */
  unlock: string | null;
  light: Palette;
  dark: Palette;
}

export const THEMES: Theme[] = [
  {
    id: 'amber', name: 'Amber Walnut', unlock: null,
    light: { user: '#c95f1c', peer: '#f5eae0', same: '#f0d2b6', sel: '#eab88e', flash: '#e0853f', tool: '#efe1d3', toolInk: '#b5531a', accent: '#c95f1c' },
    dark: { user: '#ff9a4d', peer: '#3d3430', same: '#5e4232', sel: '#7a4e30', flash: '#c95f1c', tool: '#443a35', toolInk: '#ff9a4d', accent: '#d2692a' },
  },
  {
    id: 'lavender', name: 'Lavender', unlock: 'first_win',
    light: { user: '#6a4fd0', peer: '#f1ecfb', same: '#ddd2f6', sel: '#cdbcf4', flash: '#a78bfa', tool: '#efeafb', toolInk: '#7c5cd6', accent: '#8b5cf6' },
    dark: { user: '#b49cff', peer: '#2c2742', same: '#3e3466', sel: '#53448a', flash: '#7c5cd6', tool: '#2c2742', toolInk: '#b49cff', accent: '#9f7aea' },
  },
  {
    id: 'mint', name: 'Mint', unlock: 'daily_3',
    light: { user: '#0f7a62', peer: '#e3f4ee', same: '#c4e8db', sel: '#a9dfcb', flash: '#5cc8a3', tool: '#e5f3ee', toolInk: '#1f8f72', accent: '#0f9f7c' },
    dark: { user: '#5fe0b8', peer: '#1f3532', same: '#24504a', sel: '#2b6a5e', flash: '#2e9c7f', tool: '#1f3532', toolInk: '#5fe0b8', accent: '#22b892' },
  },
  {
    id: 'sunset', name: 'Sunset', unlock: 'wins_10',
    light: { user: '#c2410c', peer: '#fdeee4', same: '#fbd9c3', sel: '#f9c8a6', flash: '#fb923c', tool: '#fdeee4', toolInk: '#d4581c', accent: '#ea580c' },
    dark: { user: '#ffa36b', peer: '#3a2a24', same: '#57372a', sel: '#73452f', flash: '#c2541c', tool: '#3a2a24', toolInk: '#ffa36b', accent: '#f97316' },
  },
  {
    id: 'rose', name: 'Rose', unlock: 'flawless',
    light: { user: '#be185d', peer: '#fcebf2', same: '#f8d2e2', sel: '#f4bdd3', flash: '#f472b6', tool: '#fcebf2', toolInk: '#d02670', accent: '#db2777' },
    dark: { user: '#ff8ac0', peer: '#3a2433', same: '#572d45', sel: '#733a5a', flash: '#c0397a', tool: '#3a2433', toolInk: '#ff8ac0', accent: '#ec4899' },
  },
  {
    id: 'gold', name: 'Gold', unlock: 'expert_win',
    light: { user: '#8a6100', peer: '#fbf3dc', same: '#f4e3ad', sel: '#efd68a', flash: '#e0b23a', tool: '#faf1d6', toolInk: '#9a6f00', accent: '#b58300' },
    dark: { user: '#ffd166', peer: '#33301f', same: '#4d4524', sel: '#6a5c27', flash: '#b48a1c', tool: '#33301f', toolInk: '#ffd166', accent: '#e0a800' },
  },
];

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

export function isDark(): boolean {
  const a = getSettings().appearance;
  return a === 'dark' || (a === 'system' && systemDark.matches);
}

export function applyTheme(id = getSettings().theme): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const dark = isDark();
  const p = dark ? theme.dark : theme.light;
  const root = document.documentElement;
  root.dataset.mode = dark ? 'dark' : 'light';
  const vars: Record<string, string> = {
    '--sd-user': p.user, '--sd-peer': p.peer, '--sd-same': p.same, '--sd-sel': p.sel,
    '--sd-flash': p.flash, '--sd-tool': p.tool, '--sd-tool-ink': p.toolInk, '--accent': p.accent,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}

systemDark.addEventListener('change', () => applyTheme());

const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

/** Sun/moon button that flips between light and dark. */
export function modeToggle(): HTMLButtonElement {
  const btn = h('button', { class: 'icon-btn mode-toggle' });
  const draw = () => {
    const dark = isDark();
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${dark ? SUN : MOON}</svg>`;
  };
  btn.addEventListener('click', () => {
    setSetting('appearance', isDark() ? 'light' : 'dark');
    applyTheme();
    draw();
  });
  draw();
  return btn;
}
