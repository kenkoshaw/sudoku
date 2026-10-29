import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { h } from './dom';
import { mount } from './game';
import { applyTheme } from './themes';
import { home, calendar, stats, awards, settings } from './screens';

registerSW({ immediate: true });
// Lets :active styles (the number key pop-up) work on iOS Safari.
document.addEventListener('touchstart', () => {}, { passive: true });
// iOS ignores user-scalable=no, so block pinch and double-tap zoom directly.
for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
applyTheme();

const app = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

const TABS = [
  { hash: '#/', label: 'Home', icon: '⌂' },
  { hash: '#/daily', label: 'Daily', icon: '📅' },
  { hash: '#/stats', label: 'Stats', icon: '📊' },
  { hash: '#/awards', label: 'Trophies', icon: '🏆' },
];

function tabBar(active: string): HTMLElement {
  return h('nav', { class: 'tab-bar' },
    ...TABS.map((t) => h('a', { href: t.hash, class: t.hash === active ? 'active' : '' }, h('span', { 'aria-hidden': 'true' }, t.icon), t.label)),
  );
}

function route(): void {
  cleanup?.();
  cleanup = null;
  const hash = location.hash || '#/';
  const main = h('main', { class: 'screen' });
  app.replaceChildren(main);
  document.body.classList.remove('in-game');

  const daily = hash.match(/^#\/daily\/(\d{4}-\d{2}-\d{2})$/);
  if (hash === '#/play' || daily) {
    document.body.classList.add('in-game');
    cleanup = mount(main, daily ? { mode: 'daily', date: daily[1] } : { mode: 'classic' });
  } else {
    const screens: Record<string, (r: HTMLElement) => void> = {
      '#/daily': calendar, '#/stats': stats, '#/awards': awards, '#/settings': settings,
    };
    (screens[hash] ?? home)(main);
    if (hash !== '#/settings') app.append(tabBar(screens[hash] ? hash : '#/'));
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
