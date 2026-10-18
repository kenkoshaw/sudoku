import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { h } from './dom';
import { mount } from './game';

registerSW({ immediate: true });

const app = document.getElementById('app')!;
const body = h('main', { class: 'game' });
app.replaceChildren(h('header', { class: 'game-head' }, h('h1', {}, 'Sudoku')), body);
mount(body);
