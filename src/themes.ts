import { getSettings } from './settings';

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
    id: 'classic', name: 'Classic', unlock: null,
    light: { user: '#325aaf', peer: '#e2ebf3', same: '#c3d7ea', sel: '#bbdefb', flash: '#8fb4e8', tool: '#eaeef4', toolInk: '#5a7bc0', accent: '#325aaf' },
    dark: { user: '#7da6ff', peer: '#273149', same: '#33456b', sel: '#3a5687', flash: '#4f74b8', tool: '#273149', toolInk: '#8fb0f5', accent: '#5b8cff' },
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

const dark = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(id = getSettings().theme): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const p = dark.matches ? theme.dark : theme.light;
  const root = document.documentElement.style;
  root.setProperty('--sd-user', p.user);
  root.setProperty('--sd-peer', p.peer);
  root.setProperty('--sd-same', p.same);
  root.setProperty('--sd-sel', p.sel);
  root.setProperty('--sd-flash', p.flash);
  root.setProperty('--sd-tool', p.tool);
  root.setProperty('--sd-tool-ink', p.toolInk);
  root.setProperty('--accent', p.accent);
}

dark.addEventListener('change', () => applyTheme());
