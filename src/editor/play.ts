// Play mode: runs the same player that exported prototypes use.
import type { Project } from '../model/types';
import type { PlayInfo, Player } from '../kit/uikit.js';
import { h, $, modalOpen } from './dom';
import { K, P, byId, scr, ui, R } from './state';
import { describeAction } from './controls';
import { setMode } from './modes';

let player: Player | null = null;
let info: PlayInfo | null = null;

export function stopPlayer(): void { player?.destroy(); player = null; }

export function renderPlay(C: HTMLElement): void {
  const s = scr();
  const from = () => ui.playFrom === 'current' ? s.id : P.start;
  C.appendChild(h('div', { class: 'bar' },
    h('div', { class: 'seg', style: 'width:auto' },
      h('button', { 'aria-pressed': String(ui.playFrom === 'start'), style: 'padding:5px 10px', onclick: () => { ui.playFrom = 'start'; R.center(); } }, 'From start'),
      h('button', { 'aria-pressed': String(ui.playFrom === 'current'), style: 'padding:5px 10px', onclick: () => { ui.playFrom = 'current'; R.center(); } }, 'From ' + s.name)),
    h('button', { class: 'btn', onclick: () => player?.restart(from()) }, 'Restart'),
    h('div', { class: 'spacer' }),
    h('span', { class: 'dim-txt' }, 'Arrows / WASD move · Enter selects · click works too')));
  const pw = h('div', { class: 'playwrap' });
  C.appendChild(pw);
  stopPlayer();
  // Play a snapshot so edits made elsewhere can't change the run mid-play.
  const snapshot: Project = structuredClone(P);
  player = K.createPlayer(pw, snapshot, {
    from: from(), hud: true,
    isActive: () => ui.mode === 'play' && !modalOpen(),
    onChange: i => { info = i; renderPlayInfo(); },
  });
  setTimeout(() => player?.focus(), 30);
}

export function renderPlayInfo(): void {
  const Rp = $('#right'); if (!Rp || ui.mode !== 'play' || !info) return;
  Rp.innerHTML = '';
  const t = info.top;
  const cr = h('div', { class: 'crumbs' });
  info.stack.forEach((id, i) => {
    const name = byId(id)?.name ?? '?';
    if (i) cr.appendChild(h('span', { style: 'color:var(--faint)' }, '›'));
    cr.appendChild(i === info!.stack.length - 1 ? h('b', null, name) : h('span', null, name));
  });
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Now showing')), cr,
    t?.notes ? h('p', { class: 'hint', style: 'color:var(--muted)' }, t.notes) : null,
    t ? h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn sm', onclick: () => { ui.screen = t.id; ui.sel = null; setMode('design'); } }, 'Edit this screen')) : null));

  const f = info.focused;
  const fs = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Selected element')));
  if (f) {
    fs.appendChild(h('div', { class: 'focusinfo' },
      h('b', null, (f.label || '(no label)').split('\n')[0]), h('br'),
      h('span', { style: 'color:var(--muted)' }, describeAction(f.action, id => byId(id)?.name) || 'Does nothing yet'),
      f.key ? h('span', null, '  ', h('span', { class: 'kchip' }, K.keyLabel(f.key))) : null,
      f.note ? h('p', { style: 'margin:6px 0 0' }, f.note) : null));
  } else fs.appendChild(h('p', { class: 'hint' }, 'Nothing selectable on this screen.'));
  Rp.appendChild(fs);
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'How it plays')),
    h('p', { class: 'hint' }, 'Element keys beat screen keys, and screen keys beat global keys. Overlays stack: Back closes the top one. Opening a screen already in the history jumps back to it instead of stacking a copy.')));
}
