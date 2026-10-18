import { load, save } from './storage';

export interface Settings {
  sound: boolean;
  theme: string;
}

const DEFAULTS: Settings = { sound: true, theme: 'classic' };

export function getSettings(): Settings {
  return { ...DEFAULTS, ...load<Partial<Settings>>('settings', {}) };
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  save('settings', { ...getSettings(), [key]: value });
}
