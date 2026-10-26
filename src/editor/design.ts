// Design mode: palette, stage, drag/resize.
import type { ElType, UIElement } from '../model/types';
import { PRESET, SIZES, mkEl, uid } from '../model/factory';
import { h, $ } from './dom';
import { K, P, R, byId, change, scr, selEl, ui } from './state';
import { setMode } from './modes';

let stageScale = 1;
const wellRO = new ResizeObserver(() => fitStage());
let lastClick = { id: null as string | null, t: 0 };

const PAL_ICONS: Record<ElType, string> = {
  button: '<svg viewBox="0 0 16 12"><rect x="1" y="2" width="14" height="8" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  panel: '<svg viewBox="0 0 16 12"><rect x="1" y="1" width="14" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3 4h5" stroke="currentColor" stroke-width="1.4"/></svg>',
  text: '<svg viewBox="0 0 16 12"><path d="M3 2h10M8 2v9" stroke="currentColor" stroke-width="1.6"/></svg>',
  shape: '<svg viewBox="0 0 16 12"><circle cx="8" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
};

export function renderDesign(C: HTMLElement): void {
  const pal = h('div', { class: 'pal' });
  (['button', 'panel', 'text', 'shape'] as ElType[]).forEach(t => {
    const b = h('button', { title: 'Drag onto the screen, or click to add', html: PAL_ICONS[t] + '<span>' + t[0].toUpperCase() + t.slice(1) + '</span>' });
    b.addEventListener('pointerdown', e => paletteDrag(e, t));
    pal.appendChild(b);
  });
  const sizeSel = h('select', {
    class: 'inp', style: 'width:auto', title: 'Screen size for the whole project',
    onchange: (e: Event) => { const [w, hh] = (e.target as HTMLSelectElement).value.split('x').map(Number); change(() => { P.canvas = { w, h: hh }; }); renderCanvas(); },
  }, SIZES.map(([w, hh, l]) => h('option', { value: w + 'x' + hh, selected: P.canvas.w === w && P.canvas.h === hh }, l)));
  if (!SIZES.some(([w, hh]) => P.canvas.w === w && P.canvas.h === hh)) sizeSel.prepend(h('option', { value: P.canvas.w + 'x' + P.canvas.h, selected: true }, P.canvas.w + ' × ' + P.canvas.h));
  C.appendChild(h('div', { class: 'bar' }, pal, h('div', { class: 'vsep' }),
    h('label', { class: 'chk', style: 'margin:0' }, h('input', { type: 'checkbox', checked: ui.snap, onchange: (e: Event) => { ui.snap = (e.target as HTMLInputElement).checked; renderCanvas(); } }), 'Snap to grid'),
    h('div', { class: 'spacer' }), sizeSel,
    h('button', { class: 'btn', onclick: () => { ui.playFrom = 'current'; setMode('play'); }, title: 'Play from this screen' }, '▶ Play here')));
  const well = h('div', { class: 'well', id: 'well' });
  C.appendChild(well);
  wellRO.disconnect(); wellRO.observe(well);
  well.addEventListener('pointerdown', e => { if (e.target === well) selectEl(null); });
  renderCanvas();
}

function fitStage(): void {
  const well = $('#well'), st = $('#stage'); if (!well || !st) return;
  const r = well.getBoundingClientRect(), pad = 36;
  stageScale = Math.max(0.05, Math.min((r.width - pad * 2) / P.canvas.w, (r.height - pad * 2) / P.canvas.h));
  st.style.transform = `translate(-50%,-50%) scale(${stageScale})`;
  st.style.setProperty('--s', String(stageScale));
}

export function renderCanvas(): void {
  const well = $('#well'); if (!well) return;
  const s = scr();
  let st = $('#stage');
  if (!st) { st = h('div', { class: 'stage', id: 'stage' }); well.appendChild(st); st.addEventListener('pointerdown', stageDown); }
  st.style.width = P.canvas.w + 'px'; st.style.height = P.canvas.h + 'px';
  st.className = 'stage' + (s.kind === 'overlay' ? ' ovl-bg' : '');
  st.style.background = s.kind === 'overlay' ? '' : s.bg;
  st.innerHTML = '';
  if (s.kind === 'overlay') st.appendChild(h('div', { style: `position:absolute;inset:0;background:rgba(0,0,0,${s.dim})` }));
  if (ui.snap) st.appendChild(h('div', { class: 'grid' }));
  s.elements.forEach(el => st!.appendChild(K.renderEl(el)));
  s.elements.forEach(el => {
    const a = el.action; const parts: HTMLElement[] = [];
    if (a.type === 'goto') parts.push(h('span', null, '→ ' + (byId(a.target)?.name ?? 'missing')));
    else if (a.type === 'back') parts.push(h('span', { class: 'b' }, '↩ Back'));
    else if (a.type === 'quit') parts.push(h('span', { class: 'b' }, '⏻ Quit'));
    if (el.key) parts.push(h('span', { class: 'k' }, K.keyLabel(el.key)));
    if (parts.length) st!.appendChild(h('div', { class: 'badge', style: `left:${el.x}px;top:${el.y}px` }, parts));
  });
  const el = selEl();
  if (el) {
    const box = h('div', { class: 'selbox', style: `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px` });
    ([['nw', 0, 0], ['n', 50, 0], ['ne', 100, 0], ['e', 100, 50], ['se', 100, 100], ['s', 50, 100], ['sw', 0, 100], ['w', 0, 50]] as const)
      .forEach(([d, x, y]) => box.appendChild(h('div', { class: 'h', 'data-dir': d, style: `left:${x}%;top:${y}%;cursor:${d}-resize` })));
    st.appendChild(box);
  }
  if (s.kind === 'overlay') st.appendChild(h('div', { class: 'ovl-note', style: 'font-size:calc(11.5px / var(--s))' }, 'Overlay: drawn over whatever screen is open'));
  fitStage();
}

const snapv = (v: number) => ui.snap ? Math.round(v / 8) * 8 : Math.round(v);

export function selectEl(id: string | null): void { ui.sel = id; renderCanvas(); R.right(); }

function stageDown(e: PointerEvent): void {
  if (e.button !== 0) return;
  const s = scr();
  const t = e.target as HTMLElement;
  const hd = t.closest<HTMLElement>('.h');
  const cur = selEl();
  if (hd && cur) return dragEl(e, cur, hd.dataset.dir!);
  const n = t.closest<HTMLElement>('.uk-el');
  if (n) {
    const el = s.elements.find(x => x.id === n.dataset.id)!;
    const now = Date.now();
    if (lastClick.id === el.id && now - lastClick.t < 380) {
      lastClick = { id: null, t: 0 };
      const i = $<HTMLTextAreaElement>('#f-label'); if (i) { i.focus(); i.select(); }
      return;
    }
    lastClick = { id: el.id, t: now };
    if (ui.sel !== el.id) { ui.sel = el.id; renderCanvas(); R.right(); }
    return dragEl(e, el, 'move');
  }
  selectEl(null);
}

function dragEl(e: PointerEvent, el: UIElement, dir: string): void {
  e.preventDefault();
  const sx = e.clientX, sy = e.clientY, o = { x: el.x, y: el.y, w: el.w, h: el.h };
  let started = false; const key = 'drag' + uid();
  const mv = (ev: PointerEvent) => {
    const dx = (ev.clientX - sx) / stageScale, dy = (ev.clientY - sy) / stageScale;
    if (!started) { if (Math.abs(dx) + Math.abs(dy) < 2) return; started = true; }
    change(() => {
      if (dir === 'move') { el.x = snapv(o.x + dx); el.y = snapv(o.y + dy); return; }
      let { x, y, w } = o, hh = o.h;
      if (dir.includes('e')) w = snapv(o.w + dx);
      if (dir.includes('s')) hh = snapv(o.h + dy);
      if (dir.includes('w')) { x = snapv(o.x + dx); w = o.x + o.w - x; }
      if (dir.includes('n')) { y = snapv(o.y + dy); hh = o.y + o.h - y; }
      if (w < 8) { if (dir.includes('w')) x = o.x + o.w - 8; w = 8; }
      if (hh < 8) { if (dir.includes('n')) y = o.y + o.h - 8; hh = 8; }
      if (el.shape === 'circle' && ev.shiftKey) { const m = Math.max(w, hh); w = hh = m; }
      Object.assign(el, { x, y, w, h: hh });
    }, key);
    renderCanvas();
  };
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); if (started) R.right(); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}

function paletteDrag(e: PointerEvent, type: ElType): void {
  e.preventDefault();
  const p = PRESET[type]; let gh: HTMLElement | null = null; const sx = e.clientX, sy = e.clientY;
  const mv = (ev: PointerEvent) => {
    if (!gh && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) { gh = h('div', { class: 'dragghost' }); document.body.appendChild(gh); }
    if (gh) { gh.style.left = ev.clientX + 'px'; gh.style.top = ev.clientY + 'px'; gh.style.width = p.w * stageScale + 'px'; gh.style.height = p.h * stageScale + 'px'; }
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
    const st = $('#stage')!; let x: number, y: number;
    if (gh) {
      gh.remove(); const r = st.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
      x = (ev.clientX - r.left) / stageScale - p.w / 2; y = (ev.clientY - r.top) / stageScale - p.h / 2;
    } else { x = P.canvas.w / 2 - p.w / 2; y = P.canvas.h / 2 - p.h / 2; }
    const el = mkEl(type, snapv(x), snapv(y));
    if (type === 'button') el.label = 'Button ' + (scr().elements.filter(q => q.type === 'button').length + 1);
    change(() => { scr().elements.push(el); });
    ui.sel = el.id; renderCanvas(); R.right();
  };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}

export function dupSel(): void {
  const el = selEl(); if (!el) return;
  const c: UIElement = { ...structuredClone(el), id: uid(), x: el.x + 16, y: el.y + 16, nav: {} };
  change(() => { scr().elements.push(c); });
  ui.sel = c.id; renderCanvas(); R.right();
}

export function delSel(): void {
  const el = selEl(); if (!el) return;
  change(() => {
    const s = scr();
    s.elements = s.elements.filter(x => x !== el);
    s.elements.forEach(x => { for (const d of Object.keys(x.nav) as (keyof UIElement['nav'])[]) if (x.nav[d] === el.id) delete x.nav[d]; });
    if (s.defaultFocus === el.id) s.defaultFocus = '';
  });
  ui.sel = null; renderCanvas(); R.right();
}

export function nudgeSel(dx: number, dy: number, big: boolean): void {
  const el = selEl(); if (!el) return;
  const step = big ? 32 : (ui.snap ? 8 : 1);
  change(() => { el.x += dx * step; el.y += dy * step; }, 'nudge' + el.id);
  renderCanvas(); R.right();
}
