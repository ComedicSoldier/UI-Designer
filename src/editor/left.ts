// Left pane: screen list, global keys, groups.
import { GROUP_COLORS, mkEl, mkScreen, uid } from '../model/factory';
import { h, $, $$ } from './dom';
import { actionSelect, keyCap } from './controls';
import { P, R, byId, change, gcol, ui } from './state';
import { setMode } from './modes';

export function renderLeft(): void {
  const L = $('#left')!; const st = L.scrollTop; L.innerHTML = '';

  const list = h('div', { class: 'slist' });
  P.screens.forEach(s => {
    const cur = ui.mode === 'flow' ? ui.flowSel === s.id : ui.screen === s.id;
    list.appendChild(h('button', {
      class: 'sitem', 'aria-current': String(cur),
      onclick: () => { ui.screen = s.id; ui.sel = null; ui.flowSel = s.id; ui.confirmDel = null; if (ui.mode === 'play') ui.playFrom = 'current'; R.all(); },
    },
      h('span', { class: 'dot', style: 'background:' + gcol(s) }),
      h('span', { class: 'nm', title: s.name }, s.name),
      h('span', { class: 'meta' }, s.id === P.start ? h('span', { class: 'tag start' }, 'Start') : null, s.kind === 'overlay' ? h('span', { class: 'tag' }, 'Overlay') : null)));
  });
  L.appendChild(h('div', { class: 'sec' },
    h('div', { class: 'sech' }, h('h3', null, 'Screens'), h('button', { class: 'btn sm', onclick: () => addScreen() }, '+ Screen')),
    list,
    h('p', { class: 'hint' }, 'Overlays draw on top of whatever screen is open, like a pause menu.')));

  const gsec = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Global keys'),
    h('button', { class: 'btn sm', onclick: () => { change(() => { P.globals.push({ id: uid(), key: '', action: { type: 'none' }, toggle: true, only: [], note: '' }); }); renderLeft(); } }, '+ Key')));
  if (!P.globals.length) gsec.appendChild(h('p', { class: 'hint' }, 'Keys that work across screens. Use these for menus with no button, like Inventory on I.'));
  const fulls = P.screens.filter(s => s.kind !== 'overlay');
  P.globals.forEach((g, ix) => {
    gsec.appendChild(h('div', { class: 'krow' },
      h('div', { class: 'r' }, keyCap(g.key, k => change(() => { g.key = k; })), actionSelect(g.action, a => change(() => { g.action = a; }))),
      h('div', { class: 'r' }, h('span', { class: 'lab', style: 'white-space:nowrap' }, 'Works on'),
        h('select', { class: 'inp', onchange: (e: Event) => change(() => { const v = (e.target as HTMLSelectElement).value; g.only = v ? [v] : []; }) },
          h('option', { value: '' }, 'Every screen'),
          fulls.map(s => h('option', { value: s.id, selected: g.only[0] === s.id }, 'Only ' + s.name)))),
      h('label', { class: 'chk', style: 'margin:0' }, h('input', { type: 'checkbox', checked: g.toggle, onchange: (e: Event) => change(() => { g.toggle = (e.target as HTMLInputElement).checked; }) }), 'Press again to close'),
      h('div', { class: 'r' },
        h('input', { class: 'inp', placeholder: 'Note', value: g.note, oninput: (e: Event) => change(() => { g.note = (e.target as HTMLInputElement).value; }, 'gn' + g.id) }),
        h('button', { class: 'btn sm ghost danger', title: 'Remove key', onclick: () => { change(() => { P.globals.splice(ix, 1); }); renderLeft(); R.center(); } }, 'Remove'))));
  });
  L.appendChild(gsec);

  const gr = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Groups'),
    h('button', { class: 'btn sm', onclick: () => { change(() => { P.groups.push({ id: uid(), name: 'New group', color: GROUP_COLORS[P.groups.length % GROUP_COLORS.length] }); }); renderLeft(); } }, '+ Group')));
  P.groups.forEach((g, ix) => {
    gr.appendChild(h('div', { class: 'row', style: 'margin-bottom:5px;flex-wrap:nowrap' },
      h('input', { type: 'color', value: g.color, class: 'gcolor', oninput: (e: Event) => { change(() => { g.color = (e.target as HTMLInputElement).value; }, 'gc' + g.id); renderDots(); if (ui.mode === 'flow') R.center(); } }),
      h('input', { class: 'inp', value: g.name, oninput: (e: Event) => change(() => { g.name = (e.target as HTMLInputElement).value; }, 'gname' + g.id) }),
      h('button', { class: 'btn sm ghost', title: 'Delete group', onclick: () => { change(() => { P.groups.splice(ix, 1); P.screens.forEach(s => { if (s.group === g.id) s.group = ''; }); }); R.all(); } }, '×')));
  });
  gr.appendChild(h('p', { class: 'hint' }, 'Color-code screens. Groups tint the flowchart.'));
  L.appendChild(gr);
  L.scrollTop = st;
}

/** Update group dots without rebuilding (keeps the color picker open). */
function renderDots(): void {
  $$('#left .sitem .dot').forEach((d, i) => { const s = P.screens[i]; if (s) d.style.background = gcol(s); });
}

export function addScreen(name?: string): void {
  const s = mkScreen(name || 'Screen ' + (P.screens.length + 1), { group: byId(ui.screen)?.group || '' });
  s.elements = [mkEl('text', 96, 80, { label: s.name, fs: 44 })];
  change(() => { P.screens.push(s); });
  ui.screen = s.id; ui.sel = null; ui.flowSel = s.id;
  if (ui.mode === 'play') setMode('design'); else R.all();
}
