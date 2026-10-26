import type { Group, Project, Screen, UIElement } from '../model/types';
import { UIKit } from '../kit/uikit.js';

export const K = UIKit();

export type Mode = 'design' | 'flow' | 'play';

/** The open project. Live binding: importers always see the current one. */
export let P: Project;

export const ui = {
  mode: 'design' as Mode,
  screen: '',
  sel: null as string | null,
  snap: true,
  flowSel: null as string | null,
  flowZoom: 1,
  playFrom: 'start' as 'start' | 'current',
  confirmDel: null as string | null,
};

/** Render hooks, filled in by main.ts so modules can request redraws without import cycles. */
export const R = {
  all: () => {},
  top: () => {},
  left: () => {},
  center: () => {},
  right: () => {},
  canvas: () => {},
};

/** Called after every project mutation (autosave hooks in here). */
let dirtyHandler: () => void = () => {};
export const onDirty = (fn: () => void) => { dirtyHandler = fn; };

let undoStack: string[] = [];
let redoStack: string[] = [];
let lastKey: string | null = null;
let lastT = 0;

export function setProject(p: Project): void {
  P = p;
  undoStack = []; redoStack = []; lastKey = null;
  ui.screen = P.start; ui.sel = null; ui.flowSel = null; ui.confirmDel = null;
}

/**
 * Mutate the project with an undo snapshot. Calls sharing `key` within 1.5 s
 * merge into one undo step (typing, dragging).
 */
export function change(fn: () => void, key?: string | null): void {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastT < 1500)) {
    undoStack.push(JSON.stringify(P));
    if (undoStack.length > 150) undoStack.shift();
    redoStack = [];
  }
  lastKey = key || null; lastT = now;
  fn();
  dirtyHandler();
  updUndo();
}
export function undo(): void {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(P)); P = JSON.parse(undoStack.pop()!); lastKey = null;
  fix(); dirtyHandler(); R.all();
}
export function redo(): void {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(P)); P = JSON.parse(redoStack.pop()!); lastKey = null;
  fix(); dirtyHandler(); R.all();
}
export const hasUndo = () => undoStack.length > 0;
export function updUndo(): void {
  const u = document.getElementById('undo') as HTMLButtonElement | null;
  const r = document.getElementById('redo') as HTMLButtonElement | null;
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}
export function fix(): void {
  if (!byId(ui.screen)) ui.screen = P.screens[0].id;
  if (ui.sel && !selEl()) ui.sel = null;
  if (ui.flowSel && !byId(ui.flowSel)) ui.flowSel = null;
}

export const byId = (id: string | undefined | null): Screen | undefined => P.screens.find(s => s.id === id);
export const scr = (): Screen => byId(ui.screen) || P.screens[0];
export const selEl = (): UIElement | undefined => scr()?.elements.find(e => e.id === ui.sel);
export const grpOf = (s: Screen): Group | undefined => P.groups.find(g => g.id === s.group);
export const gcol = (s: Screen): string => grpOf(s)?.color || '#7a8294';
