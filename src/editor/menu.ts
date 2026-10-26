// Project menu: new/open/import, saved projects, exports.
import type { Project } from '../model/types';
import { FILE_EXT, FormatError, loadProject, serialize } from '../model/format';
import { blankProject, sampleProject } from '../model/sample';
import { UIKit } from '../kit/uikit.js';
import { h, esc, modal, toast } from './dom';
import { P } from './state';
import { lib, openFile, removeFromLib, saveFile } from './storage';
import { flowSVGForExport } from './flow';

let openProjectFn: (p: Project, quiet?: boolean) => void = () => {};
export const setOpenProject = (fn: typeof openProjectFn) => { openProjectFn = fn; };

const slug = (s: string) => (s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

export function exportJSON(): void { saveFile(slug(P.name) + FILE_EXT, serialize(P), 'application/json'); }
export function exportSVG(): void { saveFile(slug(P.name) + '-flow.svg', flowSVGForExport(), 'image/svg+xml'); }

/** A single self-contained HTML file that plays the project. */
export function buildPrototypeHTML(p: Project): string {
  const data = JSON.stringify(p).replace(/</g, '\\u003c');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(p.name) + ' prototype</title>'
    + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600&family=IBM+Plex+Sans:wght@500;700&family=JetBrains+Mono:wght@600&display=swap">'
    + '<style>html,body{margin:0;height:100%;background:#000}#app{position:fixed;inset:0}</style></head><body><div id="app"></div><script>'
    + 'var UIKit=' + UIKit.toString() + ';var K=UIKit();var st=document.createElement("style");st.textContent=K.CSS;document.head.appendChild(st);'
    + 'var PROJECT=' + data + ';K.createPlayer(document.getElementById("app"),PROJECT,{hud:true});'
    + '<\/script></body></html>';
}
export function exportHTML(): void { saveFile(slug(P.name) + '-prototype.html', buildPrototypeHTML(P), 'text/html'); }

export async function importFile(): Promise<void> {
  const text = await openFile();
  if (text == null) return;
  try {
    const p = loadProject(text);
    if (lib[p.id] && lib[p.id].data !== serialize(p, false)) {
      // Same id already saved here with different content: keep both.
      p.id = Math.random().toString(36).slice(2, 10);
      p.name += ' (imported)';
    }
    openProjectFn(p);
  } catch (err) {
    toast(err instanceof FormatError || err instanceof SyntaxError ? 'Could not open that file: ' + err.message : 'Could not open that file.');
  }
}

export function projectMenu(): void {
  modal('Project', close => {
    const item = (ic: string, t: string, d: string, fn: () => void) =>
      h('button', { class: 'menu-item', onclick: () => { close(); fn(); } }, h('span', { class: 'mi' }, ic), h('span', null, h('b', null, t), h('small', null, d)));
    const entries = Object.entries(lib).sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0));
    let pending: string | null = null;
    const pl = h('div', { class: 'plist' });
    const fmt = (t: number) => new Date(t || 0).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const drawList = () => {
      pl.innerHTML = '';
      entries.forEach(([id, v]) => {
        const cur = id === P.id;
        pl.appendChild(h('div', { class: 'pl' },
          h('span', null, h('span', { class: 'n' }, v.name || 'Untitled'), h('br'), h('small', null, fmt(v.updated))),
          cur ? h('span', { class: 'tag start' }, 'Open') : h('button', { class: 'btn sm', onclick: () => { close(); try { openProjectFn(loadProject(v.data)); } catch { toast('That saved project is damaged.'); } } }, 'Open'),
          cur ? h('span') : pending === id
            ? h('button', { class: 'btn sm danger', onclick: () => { removeFromLib(id); entries.splice(entries.findIndex(x => x[0] === id), 1); pending = null; drawList(); } }, 'Confirm delete')
            : h('button', { class: 'btn sm ghost', onclick: () => { pending = id; drawList(); } }, 'Delete')));
      });
    };
    drawList();
    return [
      h('div', { class: 'grid2' },
        item('+', 'New project', 'Blank, one starter screen', () => openProjectFn(blankProject())),
        item('★', 'Load example', 'Emberfall game menus', () => openProjectFn(sampleProject()))),
      h('div', null, h('div', { class: 'subh', style: 'margin-top:0' }, 'Saved in this browser'), entries.length ? pl : h('p', { class: 'hint' }, 'Nothing saved yet.')),
      h('div', null, h('div', { class: 'subh', style: 'margin-top:0' }, 'Files'),
        h('div', { style: 'display:grid;gap:6px' },
          item('↓', 'Save project file', `${FILE_EXT}. Re-open later, move between machines, or import into Unity.`, exportJSON),
          item('↑', 'Open project file', 'Open a project file saved from here.', importFile),
          item('↓', 'Export playable prototype (.html)', 'One file. Opens in any browser, plays with keys and mouse.', exportHTML),
          item('↓', 'Export flowchart (.svg)', 'Image of how screens connect.', exportSVG))),
      h('p', { class: 'hint' }, 'Projects autosave in this browser. Clearing browser data erases them, so save a project file for anything you care about.'),
    ];
  });
}
