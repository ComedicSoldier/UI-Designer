import './styles.css';
import type { Project } from './model/types';
import { loadProject } from './model/format';
import { sampleProject } from './model/sample';
import { $, $$, modalOpen, toast } from './editor/dom';
import { K, P, R, change, fix, onDirty, redo, selEl, setProject, ui, undo, updUndo } from './editor/state';
import { lib, loadLib, markDirty, rememberCurrent, setStatus } from './editor/storage';
import { renderLeft } from './editor/left';
import { delSel, dupSel, nudgeSel, renderCanvas, renderDesign, selectEl } from './editor/design';
import { renderFlow } from './editor/flow';
import { renderPlay } from './editor/play';
import { renderRight } from './editor/inspector';
import { exportJSON, exportSVG, importFile, projectMenu, setOpenProject } from './editor/menu';
import { capturing } from './editor/controls';
import { setMode } from './editor/modes';

document.getElementById('ukcss')!.textContent = K.CSS;

function renderTop(): void {
  const pn = $<HTMLInputElement>('#pname')!;
  if (document.activeElement !== pn) pn.value = P.name;
  $$('.modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === ui.mode)));
}
function renderCenter(): void {
  const C = $('#center')!; C.innerHTML = '';
  if (ui.mode === 'design') renderDesign(C);
  else if (ui.mode === 'flow') renderFlow(C, exportSVG);
  else renderPlay(C);
}
function renderAll(): void { fix(); renderTop(); renderLeft(); renderCenter(); renderRight(); updUndo(); }

Object.assign(R, { all: renderAll, top: renderTop, left: renderLeft, center: renderCenter, right: renderRight, canvas: renderCanvas });
onDirty(markDirty);

function openProject(p: Project, quiet = false): void {
  setProject(p);
  rememberCurrent(p.id);
  renderAll();
  if (!quiet) { toast('Opened ' + p.name); markDirty(); }
}
setOpenProject(openProject);

// Top bar
$<HTMLInputElement>('#pname')!.addEventListener('input', e => change(() => { P.name = (e.target as HTMLInputElement).value; }, 'pname'));
$$('.modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode as typeof ui.mode)));
$('#undo')!.onclick = undo;
$('#redo')!.onclick = redo;
$('#projBtn')!.onclick = projectMenu;

// Editor shortcuts
window.addEventListener('keydown', e => {
  if (capturing || modalOpen()) return;
  const t = e.target as HTMLElement;
  const typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 's') { e.preventDefault(); exportJSON(); return; }
  if (mod && k === 'o') { e.preventDefault(); importFile(); return; }
  if (typing) return;
  if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (ui.mode === 'play') return; // the player owns the keyboard
  if (!mod && !e.altKey && ['1', '2', '3'].includes(e.key)) { setMode((['design', 'flow', 'play'] as const)[+e.key - 1]); return; }
  if (ui.mode !== 'design' || !selEl()) return;
  if (mod && k === 'd') { e.preventDefault(); dupSel(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); delSel(); return; }
  if (e.key === 'Escape') { selectEl(null); return; }
  const d = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, [number, number]>)[e.key];
  if (d) { e.preventDefault(); nudgeSel(d[0], d[1], e.shiftKey); }
});

// Flowchart colors are resolved to literals, so redraw when the theme flips.
const reflow = () => { if (P && ui.mode === 'flow') renderCenter(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reflow);
new MutationObserver(reflow).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Boot
const { current } = loadLib();
let first: Project | null = null;
if (current && lib[current]) { try { first = loadProject(lib[current].data); } catch { first = null; } }
openProject(first ?? sampleProject(), true);
setStatus('saved', first ? 'Saved in this browser' : 'Example project');
