// Local autosave library + file save/open.
// Desktop (Tauri) will replace saveFile/openFile with native dialogs; everything
// else calls through these two functions so that swap stays in one place.
import { P } from './state';
import { serialize } from '../model/format';

interface LibEntry { name: string; updated: number; data: string }
const LIB_KEY = 'cuid.lib';
const CUR_KEY = 'cuid.current';

export let lib: Record<string, LibEntry> = {};
let timer: number | undefined;

function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): boolean { try { localStorage.setItem(k, v); return true; } catch { return false; } }

export function setStatus(state: 'idle' | 'saved' | 'saving' | 'warn', text: string, title = ''): void {
  const el = document.getElementById('status'); if (!el) return;
  el.dataset.s = state; el.querySelector('span')!.textContent = text; el.title = title;
}

export function loadLib(): { current: string | null } {
  try { lib = JSON.parse(lsGet(LIB_KEY) || '{}') || {}; } catch { lib = {}; }
  return { current: lsGet(CUR_KEY) };
}

export function markDirty(): void {
  setStatus('saving', 'Unsaved');
  clearTimeout(timer);
  timer = window.setTimeout(saveNow, 700);
}

export function saveNow(): void {
  if (!P) return;
  lib[P.id] = { name: P.name || 'Untitled', updated: Date.now(), data: serialize(P, false) };
  const ok = lsSet(LIB_KEY, JSON.stringify(lib)) && lsSet(CUR_KEY, P.id);
  if (ok) setStatus('saved', 'Saved in this browser', 'Export a project file for a backup you can move between machines.');
  else setStatus('warn', 'Not saved', 'Browser storage is full or blocked. Export a project file now.');
}

export function rememberCurrent(id: string): void { lsSet(CUR_KEY, id); }

export function removeFromLib(id: string): void {
  delete lib[id];
  lsSet(LIB_KEY, JSON.stringify(lib));
}

/** Hand a generated file to the user. */
export async function saveFile(filename: string, data: string, mime = 'application/octet-stream'): Promise<void> {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Ask the user for a project file; resolves its text, or null if cancelled. */
export function openFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = async () => { const f = input.files?.[0]; resolve(f ? await f.text() : null); };
    input.click();
  });
}
