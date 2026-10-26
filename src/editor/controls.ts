// Shared inspector controls: key capture, action picker, color swatches.
import type { Action } from '../model/types';
import { mkEl, mkScreen, SWATCH } from '../model/factory';
import { h, toast } from './dom';
import { K, P, R, change, ui } from './state';

/** Non-null while a key capture is listening; editor shortcuts stand down. */
export let capturing: { cancel: () => void } | null = null;

export function keyCap(val: string, onSet: (k: string) => void): HTMLElement {
  const b = h('button', { class: 'keycap' + (val ? '' : ' empty'), title: 'Click, then press a key' }, val ? K.keyLabel(val) : 'Set key');
  b.addEventListener('click', () => {
    capturing?.cancel();
    b.classList.add('listening'); b.textContent = 'Press…';
    const onKey = (e: KeyboardEvent) => { const k = K.normKey(e); if (!k) return; e.preventDefault(); e.stopPropagation(); done(k); };
    const cancel = () => done(null);
    const done = (k: string | null) => {
      window.removeEventListener('keydown', onKey, true); b.removeEventListener('blur', cancel);
      b.classList.remove('listening'); capturing = null;
      if (k) { onSet(k); b.textContent = K.keyLabel(k); b.classList.remove('empty'); afterKey(false); }
      else b.textContent = val ? K.keyLabel(val) : 'Set key';
    };
    capturing = { cancel };
    window.addEventListener('keydown', onKey, true); b.addEventListener('blur', cancel);
  });
  const wrap = h('span', { class: 'row', style: 'flex-wrap:nowrap;gap:2px;flex:none' }, b);
  if (val) wrap.appendChild(h('button', { class: 'btn sm ghost ico', title: 'Clear key', onclick: () => { onSet(''); afterKey(true); } }, '×'));
  return wrap;
}
function afterKey(full: boolean): void {
  if (ui.mode === 'design') R.canvas();
  if (full) { R.left(); R.right(); } else if (ui.mode === 'flow') R.center();
}

export function actionValue(a?: Action): string {
  if (!a || a.type === 'none') return 'none';
  return a.type === 'goto' ? 'goto:' + a.target : a.type;
}

export function actionSelect(a: Action, onSet: (a: Action) => void): HTMLSelectElement {
  const sel = h('select', { class: 'inp' },
    h('option', { value: 'none' }, 'Does nothing'),
    h('optgroup', { label: 'Go to' }, P.screens.map(s => h('option', { value: 'goto:' + s.id }, '→ ' + s.name + (s.kind === 'overlay' ? ' (overlay)' : '')))),
    h('option', { value: 'back' }, '↩ Back / close'),
    h('option', { value: 'quit' }, '⏻ End preview (quit)'),
    h('option', { value: 'new' }, '+ New screen and link…'));
  sel.value = actionValue(a);
  sel.addEventListener('change', () => {
    const v = sel.value;
    if (v === 'new') {
      const s = mkScreen('Screen ' + (P.screens.length + 1));
      s.elements = [
        mkEl('text', 96, 80, { label: s.name, fs: 44 }),
        mkEl('button', 96, 600, { label: 'Back', w: 160, shape: 'pill', fill: 'transparent', key: 'Escape', action: { type: 'back' } }),
      ];
      change(() => { P.screens.push(s); onSet({ type: 'goto', target: s.id }); });
      toast(`Created "${s.name}" and linked it`);
      R.all();
      return;
    }
    onSet(v === 'none' ? { type: 'none' } : v.startsWith('goto:') ? { type: 'goto', target: v.slice(5) } : { type: v as Action['type'] });
    if (ui.mode === 'design') R.canvas(); else R.center();
    R.right();
  });
  return sel;
}

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

export function colorField(label: string, val: string, onSet: (v: string) => void, allowNone: boolean): HTMLElement {
  const row = h('div', { class: 'sw' });
  const ci = h('input', { type: 'color', value: isHex(val) ? val : '#000000', title: 'Custom color' });
  const mark = (v: string | null) => row.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  const set = (v: string) => { onSet(v); mark(v); ci.value = isHex(v) ? v : '#000000'; R.canvas(); };
  if (allowNone) row.appendChild(h('button', { class: 'none', 'data-v': 'transparent', title: 'None', 'aria-pressed': String(val === 'transparent'), onclick: () => set('transparent') }));
  SWATCH.forEach(c => row.appendChild(h('button', { 'data-v': c, title: c, style: 'background:' + c, 'aria-pressed': String(val === c), onclick: () => set(c) })));
  ci.addEventListener('input', () => { onSet(ci.value); mark(null); R.canvas(); });
  row.appendChild(ci);
  return h('div', { class: 'f' }, h('span', { class: 'lab' }, label), row);
}

export const SHAPES: [string, string, string][] = [
  ['rect', '<svg width="16" height="12"><rect x="1.5" y="2" width="13" height="8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Rectangle'],
  ['round', '<svg width="16" height="12"><rect x="1.5" y="2" width="13" height="8" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Rounded'],
  ['pill', '<svg width="16" height="12"><rect x="1.5" y="2" width="13" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Pill'],
  ['cut', '<svg width="16" height="12"><path d="M1.5 2h10l3 3v5h-10l-3-3z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Cut corners'],
  ['circle', '<svg width="16" height="12"><circle cx="8" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Circle / ellipse'],
  ['diamond', '<svg width="16" height="12"><path d="M8 1l6 5-6 5-6-5z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Diamond'],
  ['hex', '<svg width="16" height="12"><path d="M4.5 1.5h7l3 4.5-3 4.5h-7l-3-4.5z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>', 'Hexagon'],
];

export function describeAction(a: Action | undefined, nameOf: (id?: string) => string | undefined): string {
  if (!a) return '';
  if (a.type === 'goto') return '→ ' + (nameOf(a.target) ?? '?');
  if (a.type === 'back') return '↩ Back';
  if (a.type === 'quit') return '⏻ Quit';
  return '';
}
