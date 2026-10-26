// Right pane in Design mode: element inspector or screen inspector.
import type { Dir, Screen, UIElement } from '../model/types';
import { uid } from '../model/factory';
import { h, $ } from './dom';
import { actionSelect, colorField, describeAction, keyCap, SHAPES } from './controls';
import { K, P, R, byId, change, scr, selEl, ui } from './state';
import { delSel, dupSel, renderCanvas, selectEl } from './design';
import { renderFlowInfo } from './flow';
import { renderPlayInfo } from './play';

const val = (e: Event) => (e.target as HTMLInputElement).value;
const checked = (e: Event) => (e.target as HTMLInputElement).checked;

export function renderRight(): void {
  if (ui.mode === 'play') { renderPlayInfo(); return; }
  const Rp = $('#right')!; const st = Rp.scrollTop; Rp.innerHTML = '';
  if (ui.mode === 'flow') renderFlowInfo(Rp);
  else { const el = selEl(); if (el) inspectEl(Rp, el); else inspectScreen(Rp, scr()); }
  Rp.scrollTop = st;
}

function inspectEl(Rp: HTMLElement, el: UIElement): void {
  const s = scr();
  const up = (fn: () => void, key?: string) => { change(fn, key); renderCanvas(); };

  Rp.appendChild(h('div', { class: 'sec' },
    h('div', { class: 'sech' }, h('h3', null, el.type[0].toUpperCase() + el.type.slice(1) + ' on ' + s.name), h('button', { class: 'btn sm ghost', onclick: () => selectEl(null) }, 'Done')),
    h('div', { class: 'f' }, h('label', { for: 'f-label' }, 'Label'),
      h('textarea', { class: 'inp', id: 'f-label', rows: 2, style: 'min-height:38px', value: el.label, oninput: (e: Event) => up(() => { el.label = val(e); }, 'lbl' + el.id) }))));

  // Interaction
  const it = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Interaction')));
  it.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'When activated'),
    actionSelect(el.action, a => change(() => { el.action = a; if (a.type !== 'none' && !el.focusable && el.type === 'button') el.focusable = true; }))));
  it.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'Shortcut key on this screen'), h('div', { class: 'row' }, keyCap(el.key, k => change(() => { el.key = k; })))));
  it.appendChild(h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: el.focusable, onchange: (e: Event) => { change(() => { el.focusable = checked(e); }); renderRight(); } }), 'Selectable with arrow keys'));
  if (el.focusable) {
    const others = s.elements.filter(x => x.focusable && x.id !== el.id);
    const names: Record<Dir, string> = { up: '↑ Up', down: '↓ Down', left: '← Left', right: '→ Right' };
    const navRow = (dir: Dir) => h('div', { class: 'f', style: 'margin-bottom:6px' }, h('span', { class: 'lab' }, names[dir]),
      h('select', { class: 'inp', onchange: (e: Event) => change(() => { const v = val(e); if (v) el.nav[dir] = v; else delete el.nav[dir]; }) },
        h('option', { value: '' }, 'Auto (nearest)'),
        others.map(o => h('option', { value: o.id, selected: el.nav[dir] === o.id }, (o.label || 'Untitled').split('\n')[0].slice(0, 24)))));
    it.appendChild(h('details', null, h('summary', { class: 'lab', style: 'cursor:pointer;margin-bottom:8px' }, 'Arrow-key routing'),
      h('div', { class: 'grid2' }, navRow('up'), navRow('down'), navRow('left'), navRow('right')),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: s.defaultFocus === el.id, onchange: (e: Event) => change(() => { s.defaultFocus = checked(e) ? el.id : ''; }) }), 'Selected first when the screen opens')));
  }
  it.appendChild(h('div', { class: 'f' }, h('label', { for: 'f-note' }, 'Function / notes'),
    h('textarea', { class: 'inp', id: 'f-note', placeholder: 'What this does in the real game', value: el.note, oninput: (e: Event) => change(() => { el.note = val(e); }, 'note' + el.id) })));
  Rp.appendChild(it);

  // Look
  const lk = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Look')));
  const seg = h('div', { class: 'seg' });
  SHAPES.forEach(([v, ic, t]) => seg.appendChild(h('button', {
    'aria-pressed': String(el.shape === v), title: t, html: ic,
    onclick: () => { up(() => { el.shape = v as UIElement['shape']; }); seg.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(SHAPES[i][0] === v))); },
  })));
  lk.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'Shape'), seg));
  lk.appendChild(colorField('Fill', el.fill, v => change(() => { el.fill = v; }, 'fill' + el.id), true));
  lk.appendChild(colorField('Border', el.stroke, v => change(() => { el.stroke = v; if (v !== 'transparent' && !el.sw) el.sw = 2; }, 'stroke' + el.id), true));
  lk.appendChild(colorField('Text', el.ink, v => change(() => { el.ink = v; }, 'ink' + el.id), false));
  const numF = (lab: string, k: 'x' | 'y' | 'w' | 'h' | 'sw' | 'fs', min?: number) => h('div', { class: 'num' }, h('span', null, lab),
    h('input', { type: 'number', value: String(el[k]), min: min ?? '', oninput: (e: Event) => { const v = +val(e); if (isNaN(v)) return; up(() => { el[k] = min != null ? Math.max(min, v) : v; }, k + el.id); } }));
  lk.appendChild(h('div', { class: 'grid2', style: 'margin-bottom:10px' }, numF('Bd', 'sw', 0), numF('Txt', 'fs', 6)));
  const aseg = h('div', { class: 'seg' });
  ([['center', 'Center'], ['left', 'Left'], ['top-left', 'Top left']] as const).forEach(([v, t]) => aseg.appendChild(h('button', {
    'aria-pressed': String(el.align === v), style: 'font-size:12px',
    onclick: () => { up(() => { el.align = v; }); aseg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.textContent === t))); },
  }, t)));
  lk.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'Text position'), aseg));
  lk.appendChild(h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: el.bold, onchange: (e: Event) => up(() => { el.bold = checked(e); }) }), 'Bold text'));
  Rp.appendChild(lk);

  // Position + layer
  const move = (d: 1 | -1) => up(() => { const a = s.elements; const i = a.indexOf(el); const j = i + d; if (j >= 0 && j < a.length) { a.splice(i, 1); a.splice(j, 0, el); } });
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Position')),
    h('div', { class: 'grid4' }, numF('X', 'x'), numF('Y', 'y'), numF('W', 'w', 8), numF('H', 'h', 8)),
    h('div', { class: 'row', style: 'margin-top:10px' },
      h('button', { class: 'btn sm', onclick: () => move(1) }, 'Forward'),
      h('button', { class: 'btn sm', onclick: () => move(-1) }, 'Backward'),
      h('button', { class: 'btn sm', onclick: dupSel }, 'Duplicate'),
      h('button', { class: 'btn sm danger', onclick: delSel }, 'Delete')),
    h('p', { class: 'hint' }, 'Arrow keys nudge, Shift for bigger steps. Ctrl+D duplicates, Delete removes.')));
}

function inspectScreen(Rp: HTMLElement, s: Screen): void {
  const sec = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Screen')),
    h('div', { class: 'f' }, h('label', { for: 'f-sname' }, 'Name'),
      h('input', { class: 'inp', id: 'f-sname', value: s.name, oninput: (e: Event) => { change(() => { s.name = val(e); }, 'sname' + s.id); R.left(); } })));
  const kseg = h('div', { class: 'seg' });
  ([['full', 'Full screen'], ['overlay', 'Overlay']] as const).forEach(([v, t]) => kseg.appendChild(h('button', { 'aria-pressed': String(s.kind === v), style: 'font-size:12.5px', onclick: () => { change(() => { s.kind = v; }); R.all(); } }, t)));
  sec.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'Type'), kseg));
  if (s.kind === 'overlay') {
    const lab = h('span', { class: 'lab' }, `Backdrop dim: ${Math.round(s.dim * 100)}%`);
    sec.appendChild(h('div', { class: 'f' }, lab, h('input', { type: 'range', min: 0, max: 0.95, step: 0.05, value: String(s.dim),
      oninput: (e: Event) => { change(() => { s.dim = +val(e); }, 'dim' + s.id); lab.textContent = `Backdrop dim: ${Math.round(s.dim * 100)}%`; renderCanvas(); } })));
  } else sec.appendChild(colorField('Background', s.bg, v => change(() => { s.bg = v; }, 'bg' + s.id), false));
  sec.appendChild(h('div', { class: 'f' }, h('span', { class: 'lab' }, 'Group'),
    h('select', { class: 'inp', onchange: (e: Event) => { change(() => { s.group = val(e); }); R.left(); } },
      h('option', { value: '' }, 'No group'), P.groups.map(g => h('option', { value: g.id, selected: s.group === g.id }, g.name)))));
  sec.appendChild(h('div', { class: 'f' }, h('label', { for: 'f-snotes' }, 'Notes'),
    h('textarea', { class: 'inp', id: 'f-snotes', placeholder: 'Purpose, when it appears, open questions', value: s.notes, oninput: (e: Event) => change(() => { s.notes = val(e); }, 'snotes' + s.id) })));
  sec.appendChild(h('div', { class: 'row' },
    s.id === P.start ? h('span', { class: 'tag start', style: 'padding:4px 8px' }, 'Start screen')
      : h('button', { class: 'btn sm', onclick: () => { change(() => { P.start = s.id; }); R.all(); } }, 'Make start screen'),
    h('button', { class: 'btn sm', onclick: () => duplicateScreen(s) }, 'Duplicate'),
    P.screens.length > 1 ? h('button', { class: 'btn sm danger', onclick: () => { ui.confirmDel = s.id; renderRight(); } }, 'Delete') : null));
  if (ui.confirmDel === s.id) sec.appendChild(deleteConfirm(s));
  Rp.appendChild(sec);

  const ks = h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Keys on this screen'),
    h('button', { class: 'btn sm', onclick: () => { change(() => { s.keybinds.push({ id: uid(), key: '', action: { type: 'back' }, toggle: false, note: '' }); }); renderRight(); } }, '+ Key')));
  if (!s.keybinds.length) ks.appendChild(h('p', { class: 'hint' }, 'Keys that only work while this screen is on top. They override global keys, so Esc can mean Back here and Pause elsewhere.'));
  s.keybinds.forEach((kb, ix) => ks.appendChild(h('div', { class: 'krow' },
    h('div', { class: 'r' }, keyCap(kb.key, k => change(() => { kb.key = k; })), actionSelect(kb.action, a => change(() => { kb.action = a; }))),
    h('div', { class: 'r' }, h('input', { class: 'inp', placeholder: 'Note', value: kb.note, oninput: (e: Event) => change(() => { kb.note = val(e); }, 'kn' + kb.id) }),
      h('button', { class: 'btn sm ghost danger', onclick: () => { change(() => { s.keybinds.splice(ix, 1); }); renderRight(); } }, 'Remove')))));
  Rp.appendChild(ks);

  const lst = h('div', { class: 'conn' });
  s.elements.slice().reverse().forEach(e => {
    const sub = [describeAction(e.action, id => byId(id)?.name), e.key ? '[' + K.keyLabel(e.key) + ']' : ''].filter(Boolean).join(' ');
    lst.appendChild(h('button', { class: 'c', onclick: () => selectEl(e.id) }, h('span', { class: 'arrow' }, e.type[0].toUpperCase()),
      h('span', { style: 'min-width:0' }, h('span', { class: 'ell' }, (e.label || '(no label)').split('\n')[0]), sub ? h('small', null, sub) : null)));
  });
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, `Elements (${s.elements.length})`)), lst));
}

function duplicateScreen(s: Screen): void {
  const c: Screen = structuredClone(s);
  c.id = uid(); c.name = s.name + ' copy'; delete c.fx; delete c.fy;
  const map: Record<string, string> = {};
  c.elements.forEach(e => { const n = uid(); map[e.id] = n; e.id = n; });
  c.elements.forEach(e => { for (const d of Object.keys(e.nav) as Dir[]) { const t = map[e.nav[d]!]; if (t) e.nav[d] = t; else delete e.nav[d]; } });
  c.defaultFocus = map[c.defaultFocus] || '';
  c.keybinds.forEach(k => { k.id = uid(); });
  change(() => { P.screens.splice(P.screens.indexOf(s) + 1, 0, c); });
  ui.screen = c.id; R.all();
}

function deleteConfirm(s: Screen): HTMLElement {
  const refs = P.screens.reduce((n, o) => n + o.elements.filter(e => e.action.target === s.id).length + o.keybinds.filter(k => k.action.target === s.id).length, 0)
    + P.globals.filter(g => g.action.target === s.id).length;
  const msg = `Delete "${s.name}"?` + (refs ? ` ${refs} link${refs === 1 ? '' : 's'} pointing here will be set to do nothing.` : '') + ' Undo can bring it back.';
  return h('div', { class: 'confirm' }, h('span', null, msg),
    h('div', { class: 'row' },
      h('button', { class: 'btn sm danger', onclick: () => {
        change(() => {
          P.screens = P.screens.filter(x => x !== s);
          const clr = (a: UIElement['action']) => { if (a.target === s.id) { a.type = 'none'; delete a.target; } };
          P.screens.forEach(o => { o.elements.forEach(e => clr(e.action)); o.keybinds.forEach(k => clr(k.action)); });
          P.globals.forEach(g => { clr(g.action); g.only = g.only.filter(x => x !== s.id); });
          if (P.start === s.id) P.start = P.screens[0].id;
        });
        ui.confirmDel = null; ui.screen = P.start; R.all();
      } }, 'Delete screen'),
      h('button', { class: 'btn sm', onclick: () => { ui.confirmDel = null; renderRight(); } }, 'Cancel')));
}
