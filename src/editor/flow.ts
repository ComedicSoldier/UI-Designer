// Flowchart mode: graph building, SVG rendering, node drag, right-drag pan.
import type { Screen } from '../model/types';
import { uid } from '../model/factory';
import { h, esc } from './dom';
import { K, P, R, byId, change, gcol, grpOf, ui } from './state';
import { setMode } from './modes';

const NW = 220;
type EdgeKind = 'click' | 'key' | 'global';
interface Edge { from: string; to: string; kind: EdgeKind; labels: string[] }
interface Pt { x: number; y: number }
export interface FlowGraph { edges: Edge[]; back: Record<string, boolean>; depth: Record<string, number>; pos: Record<string, Pt>; NH: number }
type Colors = Record<'link' | 'key' | 'global' | 'well' | 'raise' | 'line2' | 'sel' | 'danger' | 'ink' | 'muted' | 'faint' | 'accentSoft', string>;

const TOKEN: Record<keyof Colors, string> = {
  link: '--link', key: '--key', global: '--global', well: '--well', raise: '--raise', line2: '--line-2',
  sel: '--sel', danger: '--danger', ink: '--ink', muted: '--muted', faint: '--faint', accentSoft: '--accent-soft',
};
/** SVG presentation attributes can't use var(), so resolve theme tokens to literal colors. */
export function resolvedColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  const o = {} as Colors;
  for (const k in TOKEN) o[k as keyof Colors] = cs.getPropertyValue(TOKEN[k as keyof Colors]).trim() || '#888';
  return o;
}

function thumbDims() {
  const r = P.canvas.h / P.canvas.w;
  let th = Math.round((NW - 16) * r), tw = NW - 16;
  if (th > 220) { th = 220; tw = Math.round(th / r); }
  return { tw, th };
}
const nodeH = () => 38 + thumbDims().th + 30;

export function flowGraph(): FlowGraph {
  const edges: Edge[] = []; const back: Record<string, boolean> = {};
  const push = (from: string, to: string, kind: EdgeKind, label: string) => {
    if (from === to) return;
    let e = edges.find(x => x.from === from && x.to === to && x.kind === kind);
    if (!e) { e = { from, to, kind, labels: [] }; edges.push(e); }
    if (label && !e.labels.includes(label)) e.labels.push(label);
  };
  P.screens.forEach(s => {
    s.elements.forEach(el => {
      const a = el.action;
      if (a.type === 'goto' && byId(a.target)) push(s.id, a.target!, 'click', (el.label || 'Button').split('\n')[0].trim().slice(0, 22) + (el.key ? ' [' + K.keyLabel(el.key) + ']' : ''));
      if (a.type === 'back') back[s.id] = true;
    });
    s.keybinds.forEach(kb => {
      const a = kb.action;
      if (a.type === 'goto' && byId(a.target)) push(s.id, a.target!, 'key', '[' + K.keyLabel(kb.key || '?') + ']');
      if (a.type === 'back') back[s.id] = true;
    });
  });
  P.globals.forEach(g => {
    const a = g.action;
    if (a.type === 'goto' && byId(a.target)) push('@any', a.target!, 'global', '[' + K.keyLabel(g.key || '?') + ']' + (g.only.length && byId(g.only[0]) ? ' in ' + byId(g.only[0])!.name : ''));
  });

  // Breadth-first depth from the start screen. Global keys scoped to a screen sit one step after it.
  const depth: Record<string, number> = { [P.start]: 0 };
  let changed = true, guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    edges.forEach(e => {
      let d: number;
      if (e.from === '@any') {
        const g = P.globals.find(x => x.action.target === e.to && x.only.length);
        const sc = g ? g.only[0] : null;
        if (sc) { if (depth[sc] == null) return; d = depth[sc] + 1; } else d = 1;
      } else { if (depth[e.from] == null) return; d = depth[e.from] + 1; }
      if (depth[e.to] == null || d < depth[e.to]) { depth[e.to] = d; changed = true; }
    });
  }
  const maxD = Math.max(0, ...Object.values(depth));
  const NH = nodeH(); const cols: Record<number, Screen[]> = {}; const pos: Record<string, Pt> = {};
  P.screens.forEach(s => { const d = depth[s.id] ?? maxD + 1; (cols[d] = cols[d] || []).push(s); });
  Object.entries(cols).forEach(([d, list]) => list.forEach((s, i) => {
    pos[s.id] = s.fx != null && s.fy != null ? { x: s.fx, y: s.fy } : { x: 60 + +d * (NW + 110), y: 70 + i * (NH + 46) };
  }));
  if (P.globals.length) { const c0 = cols[0] || []; pos['@any'] = P.anyPos || { x: 60, y: 70 + c0.length * (NH + 46) + 10 }; }
  return { edges, back, depth, pos, NH };
}

export function flowSVG(G: FlowGraph, col: Colors, forExport: boolean): string {
  const { edges, back, depth, pos, NH } = G;
  let W = 0, H = 0;
  Object.entries(pos).forEach(([id, p]) => { W = Math.max(W, p.x + NW + 120); H = Math.max(H, p.y + (id === '@any' ? 70 : NH) + 140); });
  if (!forExport) { W += 600; H += 400; }
  const { tw: thumbW, th: thumbH } = thumbDims();
  const z = forExport ? 1 : ui.flowZoom;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * z}" height="${H * z}" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Sans, system-ui, sans-serif">`;
  o += '<defs>';
  ([['click', col.link], ['key', col.key], ['global', col.global]] as const).forEach(([k, c]) =>
    o += `<marker id="ar-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`);
  o += `</defs><rect width="${W}" height="${H}" fill="${col.well}"/>`;
  const box = (id: string) => { const p = pos[id]; return p ? { x: p.x, y: p.y, w: NW, h: id === '@any' ? 56 : NH } : null; };
  const pairCount: Record<string, number> = {};
  const labels: { lx: number; ly: number; t: string; c: string }[] = [];

  edges.forEach(e => {
    const a = box(e.from), b = box(e.to); if (!a || !b) return;
    const pk = [e.from, e.to].sort().join('|'); const n = pairCount[pk] = (pairCount[pk] || 0) + 1; const off = (n - 1) * 14;
    let d: string, lx: number, ly: number;
    if (b.x > a.x + a.w - 4) { // forward: right side to left side
      const x1 = a.x + a.w, y1 = a.y + Math.min(a.h / 2, 46) + off, x2 = b.x, y2 = b.y + Math.min(b.h / 2, 46) + off, mx = (x2 - x1) / 2;
      d = `M${x1} ${y1} C${x1 + mx} ${y1},${x2 - mx} ${y2},${x2} ${y2}`; lx = (x1 + x2) / 2; ly = (y1 + y2) / 2;
    } else if (b.x + b.w < a.x + 4) { // backward: loop underneath
      const x1 = a.x, y1 = a.y + a.h - 26 - off, x2 = b.x + b.w, y2 = b.y + b.h - 26 - off, dip = Math.max(a.y + a.h, b.y + b.h) + 40 + off * 2;
      d = `M${x1} ${y1} C${x1 - 60} ${dip},${x2 + 60} ${dip},${x2} ${y2}`; lx = (x1 + x2) / 2; ly = 0.125 * y1 + 0.75 * dip + 0.125 * y2;
    } else { // same column: bulge out to the right
      const down = b.y > a.y; const x1 = a.x + a.w, y1 = down ? a.y + a.h - 30 - off : a.y + 30 + off, x2 = b.x + b.w, y2 = down ? b.y + 30 + off : b.y + b.h - 30 - off, bx = Math.max(x1, x2) + 60 + off * 2;
      d = `M${x1} ${y1} C${bx} ${y1},${bx} ${y2},${x2} ${y2}`; lx = 0.125 * x1 + 0.75 * bx + 0.125 * x2; ly = (y1 + y2) / 2;
    }
    const c = e.kind === 'click' ? col.link : e.kind === 'global' ? col.global : col.key;
    const dash = e.kind === 'click' ? '' : ' stroke-dasharray="7 5"';
    o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2"${dash} marker-end="url(#ar-${e.kind})"/>`;
    const txt = e.labels.join(', ');
    labels.push({ lx, ly, t: txt.length > 34 ? txt.slice(0, 32) + '…' : txt, c });
  });

  P.screens.forEach(s => {
    const p = pos[s.id]; const sel = ui.flowSel === s.id && !forExport; const unreached = depth[s.id] == null; const gc = gcol(s);
    o += `<g class="fnode" data-id="${s.id}" transform="translate(${p.x} ${p.y})">`;
    if (s.kind === 'overlay') o += `<rect x="5" y="5" width="${NW}" height="${NH}" rx="9" fill="${col.raise}" stroke="${col.line2}"/>`;
    o += `<rect width="${NW}" height="${NH}" rx="9" fill="${col.raise}" stroke="${sel ? col.sel : unreached ? col.danger : col.line2}" stroke-width="${sel ? 2.5 : 1.2}"${unreached && !sel ? ' stroke-dasharray="5 4"' : ''}/>`;
    o += `<rect x="10" y="15" width="10" height="10" rx="3" fill="${gc}"/>`;
    o += `<text x="27" y="25" font-size="13.5" font-weight="600" fill="${col.ink}">${esc(s.name.length > 20 ? s.name.slice(0, 19) + '…' : s.name)}</text>`;
    if (s.kind === 'overlay') o += `<text x="${NW - 10}" y="24" font-size="9.5" font-family="JetBrains Mono, monospace" font-weight="600" fill="${col.muted}" text-anchor="end">OVERLAY</text>`;
    const tx = (NW - thumbW) / 2, ty = 38, sc = thumbW / P.canvas.w;
    o += `<g transform="translate(${tx} ${ty})"><rect width="${thumbW}" height="${thumbH}" rx="3" fill="${s.kind === 'overlay' ? '#2e231c' : s.bg}"/>`;
    if (s.kind === 'overlay') o += `<rect width="${thumbW}" height="${thumbH}" rx="3" fill="#000" opacity="${s.dim}"/>`;
    o += `<g transform="scale(${sc})">`;
    s.elements.forEach(el => {
      const r = el.shape === 'pill' || el.shape === 'circle' ? Math.min(el.w, el.h) / 2 : el.shape === 'round' ? 10 : 0;
      const hasStroke = el.sw && el.stroke && el.stroke !== 'transparent';
      if (!el.fill || el.fill === 'transparent') {
        if (el.label) o += `<rect x="${el.x}" y="${el.y + el.h * 0.3}" width="${Math.min(el.w, el.label.length * el.fs * 0.55)}" height="${Math.max(el.h * 0.4, 6)}" fill="${el.ink}" opacity=".55"/>`;
        if (hasStroke) o += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${r}" fill="none" stroke="${el.stroke}" stroke-width="${Math.max(el.sw, 4)}"/>`;
        return;
      }
      o += `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${r}" fill="${el.fill}"${hasStroke ? ` stroke="${el.stroke}" stroke-width="${Math.max(el.sw, 4)}"` : ''}/>`;
    });
    o += '</g></g>';
    const fy = ty + thumbH + 19;
    const nb = s.elements.filter(e => e.action.type === 'goto').length, nk = s.keybinds.length + s.elements.filter(e => e.key).length;
    let fx = 10;
    if (s.id === P.start) { o += `<rect x="${fx}" y="${fy - 12}" width="40" height="16" rx="3" fill="${col.accentSoft}"/><text x="${fx + 20}" y="${fy}" font-size="9.5" font-family="JetBrains Mono, monospace" font-weight="600" fill="${col.key}" text-anchor="middle">START</text>`; fx += 46; }
    if (unreached) { o += `<text x="${fx}" y="${fy}" font-size="11" fill="${col.danger}">Unreachable</text>`; fx += 78; }
    if (back[s.id]) { o += `<text x="${fx}" y="${fy}" font-size="11" fill="${col.muted}">↩ back</text>`; }
    o += `<text x="${NW - 10}" y="${fy}" font-size="10.5" fill="${col.faint}" text-anchor="end" font-family="JetBrains Mono, monospace">${nb} link${nb === 1 ? '' : 's'} · ${nk} key${nk === 1 ? '' : 's'}</text>`;
    o += '</g>';
  });
  if (pos['@any']) {
    const p = pos['@any'];
    o += `<g class="fnode" data-id="@any" transform="translate(${p.x} ${p.y})"><rect width="${NW}" height="56" rx="28" fill="${col.raise}" stroke="${col.global}" stroke-width="1.5" stroke-dasharray="7 5"/>`;
    o += `<text x="${NW / 2}" y="24" text-anchor="middle" font-size="13" font-weight="600" fill="${col.ink}">Global keys</text><text x="${NW / 2}" y="41" text-anchor="middle" font-size="11" fill="${col.muted}">work across screens</text></g>`;
  }
  labels.forEach(l => {
    const w = l.t.length * 6.3 + 12;
    o += `<g transform="translate(${l.lx} ${l.ly})"><rect x="${-w / 2}" y="-10" width="${w}" height="19" rx="4" fill="${col.raise}" stroke="${l.c}" stroke-width="1"/><text y="3.5" text-anchor="middle" font-size="11" font-family="JetBrains Mono, monospace" font-weight="500" fill="${col.ink}">${esc(l.t)}</text></g>`;
  });
  return o + '</svg>';
}

export const flowSVGForExport = (): string => flowSVG(flowGraph(), resolvedColors(), true);

let lastClick = { id: null as string | null, t: 0 };

export function renderFlow(C: HTMLElement, onExportSVG: () => void): void {
  const leg = (c: string, dash: string) => `<svg viewBox="0 0 28 8"><path d="M1 4H27" style="stroke:${c}" stroke-width="2" ${dash}/></svg>`;
  C.appendChild(h('div', { class: 'bar' },
    h('div', { class: 'legend' },
      h('span', { html: leg('var(--link)', '') + 'Button' }),
      h('span', { html: leg('var(--key)', 'stroke-dasharray="6 4"') + 'Screen key' }),
      h('span', { html: leg('var(--global)', 'stroke-dasharray="6 4"') + 'Global key' }),
      h('span', { style: 'color:var(--faint)' }, 'Right-drag to move view')),
    h('div', { class: 'spacer' }),
    h('button', { class: 'btn', title: 'Reset node positions', onclick: () => { change(() => { P.screens.forEach(s => { delete s.fx; delete s.fy; }); delete P.anyPos; }); R.center(); } }, 'Auto layout'),
    h('button', { class: 'btn ico', title: 'Zoom out', onclick: () => { ui.flowZoom = Math.max(0.4, ui.flowZoom - 0.15); R.center(); } }, '−'),
    h('span', { class: 'dim-txt' }, Math.round(ui.flowZoom * 100) + '%'),
    h('button', { class: 'btn ico', title: 'Zoom in', onclick: () => { ui.flowZoom = Math.min(2, ui.flowZoom + 0.15); R.center(); } }, '+'),
    h('button', { class: 'btn', onclick: onExportSVG }, 'Export SVG')));

  const wrap = h('div', { class: 'flowwrap', id: 'flowwrap' });
  const G = flowGraph();
  wrap.innerHTML = flowSVG(G, resolvedColors(), false);
  C.appendChild(wrap);
  const svg = wrap.querySelector('svg')!;
  const keepScroll = (fn: () => void) => { const st = wrap.scrollTop, sl = wrap.scrollLeft; fn(); const w2 = document.getElementById('flowwrap'); if (w2) { w2.scrollTop = st; w2.scrollLeft = sl; } };

  // Right-drag anywhere pans the view.
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  wrap.addEventListener('pointerdown', e => {
    if (e.button !== 2) return;
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, l = wrap.scrollLeft, t = wrap.scrollTop;
    wrap.style.cursor = 'grabbing';
    const mv = (ev: PointerEvent) => { wrap.scrollLeft = l - (ev.clientX - sx); wrap.scrollTop = t - (ev.clientY - sy); };
    const up = () => { wrap.style.cursor = ''; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  }, true);

  // Left-drag moves a node; click selects; double-click opens it in Design.
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const g = (e.target as Element).closest<SVGGElement>('.fnode'); if (!g) return;
    e.preventDefault();
    const id = g.dataset.id!; const sx = e.clientX, sy = e.clientY; const p0 = { ...G.pos[id] };
    let moved = false; let np: Pt | null = null; const key = 'fmove' + uid();
    const mv = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / ui.flowZoom, dy = (ev.clientY - sy) / ui.flowZoom;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return; moved = true;
      np = { x: Math.max(10, Math.round(p0.x + dx)), y: Math.max(10, Math.round(p0.y + dy)) };
      g.setAttribute('transform', `translate(${np.x} ${np.y})`);
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (moved && np) {
        const dest = np;
        change(() => {
          if (id === '@any') { P.anyPos = dest; return; }
          // Pin every node so the others don't jump when one leaves auto layout.
          P.screens.forEach(s => { if (s.fx == null) { s.fx = G.pos[s.id].x; s.fy = G.pos[s.id].y; } });
          if (P.globals.length && !P.anyPos && G.pos['@any']) P.anyPos = G.pos['@any'];
          const s = byId(id)!; s.fx = dest.x; s.fy = dest.y;
        }, key);
        keepScroll(R.center);
      } else if (id !== '@any') {
        const now = Date.now();
        if (lastClick.id === id && now - lastClick.t < 380) { lastClick = { id: null, t: 0 }; ui.screen = id; ui.sel = null; setMode('design'); return; }
        lastClick = { id, t: now };
        ui.flowSel = id; ui.screen = id;
        keepScroll(R.center); R.right(); R.left();
      }
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
}

export function renderFlowInfo(Rp: HTMLElement): void {
  const s = byId(ui.flowSel);
  if (!s) {
    Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, 'Flowchart')),
      h('p', { class: 'hint' }, 'Click a screen to see its connections. Double-click to edit it. Drag to rearrange, right-drag to move the view.')));
    return;
  }
  const lbl = (a: { type: string; target?: string }) => a.type === 'goto' ? byId(a.target)?.name ?? '?' : a.type === 'back' ? 'Back' : a.type === 'quit' ? 'Quit' : '';
  const out: { via: string; key: string; to: string; tid?: string; note: string }[] = [];
  const inc: { from: string; fid: string | null; via: string; key: string; note: string }[] = [];
  s.elements.forEach(e => { if (e.action.type !== 'none') out.push({ via: (e.label || 'Button').split('\n')[0], key: e.key, to: lbl(e.action), tid: e.action.target, note: e.note }); });
  s.keybinds.forEach(k => { if (k.action.type !== 'none') out.push({ via: 'Key', key: k.key, to: lbl(k.action), tid: k.action.target, note: k.note }); });
  P.screens.forEach(o => {
    o.elements.forEach(e => { if (e.action.target === s.id) inc.push({ from: o.name, fid: o.id, via: (e.label || 'Button').split('\n')[0], key: e.key, note: e.note }); });
    o.keybinds.forEach(k => { if (k.action.target === s.id) inc.push({ from: o.name, fid: o.id, via: 'Key', key: k.key, note: k.note }); });
  });
  P.globals.forEach(g => { if (g.action.target === s.id) inc.push({ from: g.only.length && byId(g.only[0]) ? byId(g.only[0])!.name + ' (global)' : 'Anywhere (global)', fid: null, via: 'Key', key: g.key, note: g.note }); });

  const row = (arrow: string, main: string, sub: string, key: string, go: (() => void) | null) =>
    h('button', { class: 'c', onclick: go, style: go ? '' : 'cursor:default' }, h('span', { class: 'arrow' }, arrow),
      h('span', { style: 'min-width:0' }, h('span', null, main, key ? h('span', null, ' ', h('span', { class: 'kchip' }, K.keyLabel(key))) : null), sub ? h('small', null, sub) : null));
  const pick = (id?: string | null) => id ? () => { ui.flowSel = id; ui.screen = id; R.all(); } : null;

  Rp.appendChild(h('div', { class: 'sec' },
    h('div', { class: 'sech' }, h('h3', null, s.name), h('button', { class: 'btn sm', onclick: () => { ui.screen = s.id; ui.sel = null; setMode('design'); } }, 'Edit')),
    h('div', { class: 'row', style: 'margin-bottom:6px' }, h('span', { style: `width:10px;height:10px;border-radius:3px;background:${gcol(s)}` }),
      h('span', { class: 'hint', style: 'margin:0' }, (grpOf(s)?.name ?? 'No group') + ' · ' + (s.kind === 'overlay' ? 'Overlay' : 'Full screen'))),
    s.notes ? h('p', { class: 'hint', style: 'color:var(--muted)' }, s.notes) : null));

  const ol = h('div', { class: 'conn' });
  out.forEach(o => ol.appendChild(row('→', o.to + ' ', o.via + (o.note ? ' · ' + o.note : ''), o.key, pick(o.tid))));
  if (!out.length) ol.appendChild(h('p', { class: 'hint' }, 'Dead end. Nothing leaves this screen.'));
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, `Leads to (${out.length})`)), ol));

  const il = h('div', { class: 'conn' });
  inc.forEach(o => il.appendChild(row('←', o.from + ' ', o.via + (o.note ? ' · ' + o.note : ''), o.key, pick(o.fid))));
  if (!inc.length) il.appendChild(h('p', { class: 'hint' }, s.id === P.start ? 'Start screen.' : 'Nothing links here, so players can never see this screen.'));
  Rp.appendChild(h('div', { class: 'sec' }, h('div', { class: 'sech' }, h('h3', null, `Reached from (${inc.length})`)), il));
}
