import type { Action, Project, UIElement } from './types';
import { mkEl, mkScreen, uid } from './factory';
import { FORMAT_ID, FORMAT_VERSION } from './format';

/** Example project: a small game menu set that shows every feature. */
export function sampleProject(): Project {
  const g = { front: uid(), set: uid(), game: uid(), sys: uid() };
  const P: Project = {
    format: FORMAT_ID, v: FORMAT_VERSION, id: uid(), name: 'Emberfall menus', canvas: { w: 1280, h: 720 }, start: '', screens: [], globals: [],
    groups: [
      { id: g.front, name: 'Front end', color: '#4a86d8' },
      { id: g.set, name: 'Settings', color: '#8a6dd0' },
      { id: g.game, name: 'In-game', color: '#e0a63a' },
      { id: g.sys, name: 'System', color: '#c94a5a' },
    ],
  };
  const add = (name: string, over: Parameters<typeof mkScreen>[1]) => { const s = mkScreen(name, over); P.screens.push(s); return s; };
  const title = add('Title', { group: g.front, bg: '#0d0f16', notes: 'First thing the player sees. Any confirm input continues.' });
  const main = add('Main Menu', { group: g.front, bg: '#12141f' });
  const settings = add('Settings', { group: g.set, bg: '#141522' });
  const audio = add('Audio', { group: g.set, bg: '#141522' });
  const controls = add('Controls', { group: g.set, bg: '#141522' });
  const game = add('Gameplay', { group: g.game, bg: '#1f2a24', notes: 'In-game HUD. No buttons here: every menu from this screen opens by keybind only.' });
  const pause = add('Pause', { kind: 'overlay', group: g.game, dim: 0.6 });
  const inv = add('Inventory', { kind: 'overlay', group: g.game, dim: 0.5, notes: 'Keybind-only menu. Not reachable from any button.' });
  const map = add('Map', { kind: 'overlay', group: g.game, dim: 0.6, notes: 'Keybind-only menu.' });
  const quit = add('Quit Confirm', { kind: 'overlay', group: g.sys, dim: 0.7 });
  P.start = title.id;

  const go = (id: string): Action => ({ type: 'goto', target: id });
  const back: Action = { type: 'back' };
  const btn = (x: number, y: number, label: string, action: Action, over: Partial<UIElement> = {}) => mkEl('button', x, y, { label, action, ...over });
  const txt = (x: number, y: number, label: string, over: Partial<UIElement> = {}) => mkEl('text', x, y, { label, ...over });

  title.elements = [
    txt(0, 230, 'EMBERFALL', { w: 1280, h: 110, fs: 96, align: 'center', ink: '#e3b04e' }),
    txt(0, 340, 'a Comedical Studios game', { w: 1280, h: 40, fs: 20, align: 'center', bold: false, ink: '#98a1b5' }),
    btn(490, 520, 'Press Enter', go(main.id), { shape: 'pill', fill: 'transparent', stroke: '#e3b04e', ink: '#e3b04e', key: 'Enter', note: 'Continue to main menu' }),
  ];
  main.elements = [
    txt(96, 90, 'EMBERFALL', { w: 600, h: 80, fs: 56, ink: '#e3b04e' }),
    btn(96, 240, 'Continue', go(game.id), { shape: 'cut', note: 'Load most recent save' }),
    btn(96, 310, 'New Game', go(game.id), { shape: 'cut', note: 'Start new save slot' }),
    btn(96, 380, 'Settings', go(settings.id), { shape: 'cut' }),
    btn(96, 450, 'Quit', go(quit.id), { shape: 'cut', note: 'Ask before closing the game' }),
    mkEl('panel', 640, 200, { label: 'Key art', w: 560, h: 400, fill: '#1a1d2b', stroke: '#2b3550' }),
  ];
  settings.elements = [
    txt(96, 80, 'Settings', { fs: 44 }),
    btn(96, 200, 'Audio', go(audio.id), { w: 240 }),
    btn(96, 270, 'Controls', go(controls.id), { w: 240 }),
    btn(96, 340, 'Display', { type: 'none' }, { w: 240, note: 'Not designed yet' }),
    btn(96, 600, 'Back', back, { w: 160, shape: 'pill', fill: 'transparent', key: 'Escape' }),
    mkEl('panel', 400, 200, { label: 'Choose a category', w: 780, h: 360 }),
  ];
  const slider = (y: number, label: string, note: string) => mkEl('panel', 96, y, { label, w: 700, h: 70, shape: 'rect', align: 'left', bold: false, ink: '#eef1f6', focusable: true, note });
  audio.elements = [
    txt(96, 80, 'Audio', { fs: 44 }),
    slider(180, 'Master volume', 'Slider 0-100. Left/Right adjusts in final game.'),
    slider(260, 'Music volume', 'Slider 0-100'),
    slider(340, 'Effects volume', 'Slider 0-100'),
    btn(96, 600, 'Back', back, { w: 160, shape: 'pill', fill: 'transparent', key: 'Escape' }),
  ];
  controls.elements = [
    txt(96, 80, 'Controls', { fs: 44 }),
    mkEl('panel', 96, 180, { label: 'Move    WASD\nInventory    I\nMap    M\nPause    Esc', w: 520, h: 260, ink: '#eef1f6', bold: false, fs: 22 }),
    btn(96, 600, 'Back', back, { w: 160, shape: 'pill', fill: 'transparent', key: 'Escape' }),
  ];
  game.elements = [
    mkEl('shape', 1100, 30, { w: 150, h: 150, shape: 'circle', fill: '#26332c', stroke: '#4b6555', sw: 3, label: 'Minimap', ink: '#98a1b5', fs: 14 }),
    mkEl('shape', 30, 30, { w: 320, h: 26, shape: 'pill', fill: '#c23c4d', label: 'HP 84 / 100', ink: '#fff', fs: 14, align: 'left' }),
    mkEl('shape', 30, 64, { w: 220, h: 18, shape: 'pill', fill: '#46628f', label: '', ink: '#fff' }),
    ...[0, 1, 2, 3, 4].map(i => mkEl('shape', 430 + i * 88, 620, { w: 76, h: 76, shape: 'round', fill: '#1a2420', stroke: '#4b6555', sw: 2, label: String(i + 1), ink: '#98a1b5', fs: 14, align: 'top-left' })),
    txt(0, 330, '[ game world ]', { w: 1280, h: 60, fs: 22, align: 'center', bold: false, ink: '#4b6555' }),
  ];
  pause.elements = [
    mkEl('panel', 440, 140, { label: '', w: 400, h: 440, shape: 'cut', fill: '#12141f', stroke: '#e3b04e' }),
    txt(440, 170, 'PAUSED', { w: 400, h: 60, fs: 40, align: 'center', ink: '#e3b04e' }),
    btn(500, 270, 'Resume', back, { note: 'Close pause, return to play' }),
    btn(500, 340, 'Settings', go(settings.id)),
    btn(500, 410, 'Main Menu', go(main.id), { note: 'Unsaved progress is lost. Needs a confirm later.' }),
    btn(500, 480, 'Quit Game', go(quit.id)),
  ];
  inv.elements = [
    mkEl('panel', 240, 90, { label: 'Inventory', w: 800, h: 540, fill: '#151a17', stroke: '#4b6555', ink: '#eef1f6', fs: 22 }),
    ...Array.from({ length: 12 }, (_, i) => mkEl('button', 290 + (i % 4) * 130, 170 + Math.floor(i / 4) * 130, { label: '', w: 110, h: 110, shape: 'round', fill: '#1f2a24', stroke: '#4b6555', note: 'Item slot ' + (i + 1) + '. Select to inspect.' })),
    mkEl('panel', 830, 170, { label: 'Item details', w: 170, h: 370, fill: '#1a221d', stroke: '#2e3b33', fs: 14 }),
    btn(290, 560, 'Close  [I]', back, { w: 200, h: 44, fs: 16, shape: 'pill', fill: 'transparent', stroke: '#4b6555' }),
  ];
  inv.keybinds = [{ id: uid(), key: 'Escape', action: back, toggle: false, note: 'Esc closes inventory instead of opening pause' }];
  map.elements = [
    mkEl('panel', 120, 70, { label: 'World map', w: 1040, h: 580, fill: '#1d1f18', stroke: '#e3b04e', ink: '#e3b04e', fs: 22 }),
    mkEl('shape', 560, 320, { w: 26, h: 26, shape: 'diamond', fill: '#e3b04e', label: '' }),
  ];
  map.keybinds = [{ id: uid(), key: 'Escape', action: back, toggle: false, note: '' }];
  quit.elements = [
    mkEl('panel', 390, 230, { label: '', w: 500, h: 260, fill: '#1a1214', stroke: '#c23c4d' }),
    txt(390, 265, 'Quit to desktop?', { w: 500, h: 60, fs: 30, align: 'center' }),
    btn(430, 390, 'Yes, quit', { type: 'quit' }, { w: 200, fill: '#c23c4d', stroke: '#c23c4d', note: 'Closes the game' }),
    btn(650, 390, 'Cancel', back, { w: 200, key: 'Escape' }),
  ];
  quit.defaultFocus = quit.elements[3].id;
  P.globals = [
    { id: uid(), key: 'Escape', action: go(pause.id), toggle: true, only: [game.id], note: 'Pause. Press again to resume.' },
    { id: uid(), key: 'I', action: go(inv.id), toggle: true, only: [game.id], note: 'Inventory' },
    { id: uid(), key: 'M', action: go(map.id), toggle: true, only: [game.id], note: 'Map' },
  ];
  return P;
}

export function blankProject(): Project {
  const s = mkScreen('Main Menu');
  s.elements = [
    mkEl('text', 96, 90, { label: 'Main Menu', fs: 48 }),
    mkEl('button', 96, 240, { label: 'Start' }),
    mkEl('button', 96, 310, { label: 'Options' }),
    mkEl('button', 96, 380, { label: 'Quit', action: { type: 'quit' } }),
  ];
  return {
    format: FORMAT_ID, v: FORMAT_VERSION, id: uid(), name: 'Untitled UI', canvas: { w: 1280, h: 720 }, start: s.id,
    screens: [s], globals: [], groups: [{ id: uid(), name: 'Menus', color: '#4a86d8' }],
  };
}
