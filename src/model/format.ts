import type { Project, Screen } from './types';
import { mkScreen, uid } from './factory';

/**
 * Current project file version. Bump it whenever the saved shape changes,
 * and add a step to MIGRATIONS that upgrades the previous version.
 */
export const FORMAT_VERSION = 1;
export const FORMAT_ID = 'comedical-ui';
export const FILE_EXT = '.cuid.json';

/** MIGRATIONS[n] upgrades a version-n file to version n+1. */
const MIGRATIONS: Record<number, (p: any) => any> = {
  // 1: p => { ...; p.v = 2; return p; },
};

export class FormatError extends Error {}

/** Parse untrusted JSON (file import, storage) into a valid current-version Project. */
export function loadProject(raw: unknown): Project {
  let p: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!p || typeof p !== 'object' || !Array.isArray(p.screens)) throw new FormatError('This file has no screens, so it is not a Comedical UI project.');
  if (p.format && p.format !== FORMAT_ID) throw new FormatError(`Unknown file format "${p.format}".`);
  let v = typeof p.v === 'number' ? p.v : 1;
  if (v > FORMAT_VERSION) throw new FormatError(`This project was saved by a newer version (file v${v}, app v${FORMAT_VERSION}). Update the app to open it.`);
  while (v < FORMAT_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new FormatError(`No upgrade path from file version ${v}.`);
    p = step(p);
    v = p.v;
  }
  return normalize(p);
}

/** Fill defaults and repair dangling references. Safe to run on any current-version project. */
export function normalize(p: any): Project {
  p.format = FORMAT_ID;
  p.v = FORMAT_VERSION;
  p.id = typeof p.id === 'string' && p.id ? p.id : uid();
  p.name = typeof p.name === 'string' ? p.name : 'Untitled';
  p.canvas = p.canvas && p.canvas.w > 0 && p.canvas.h > 0 ? { w: +p.canvas.w, h: +p.canvas.h } : { w: 1280, h: 720 };
  p.screens = (p.screens || []).filter((s: any) => s && typeof s === 'object');
  p.globals = Array.isArray(p.globals) ? p.globals : [];
  p.groups = Array.isArray(p.groups) ? p.groups : [];
  if (!p.screens.length) p.screens.push(mkScreen('Main Menu'));

  const ids = new Set<string>();
  p.screens.forEach((s: any) => {
    const base = mkScreen(s.name || 'Screen');
    for (const k of Object.keys(base) as (keyof Screen)[]) if (s[k] === undefined) s[k] = base[k];
    if (!s.id || ids.has(s.id)) s.id = uid();
    ids.add(s.id);
    s.elements = (s.elements || []).filter((e: any) => e && typeof e === 'object');
    s.keybinds = Array.isArray(s.keybinds) ? s.keybinds : [];
    s.elements.forEach((e: any) => {
      e.id = e.id || uid();
      e.action = e.action && e.action.type ? e.action : { type: 'none' };
      e.nav = e.nav && typeof e.nav === 'object' ? e.nav : {};
      e.key = e.key || '';
      e.note = e.note || '';
      e.label = e.label ?? '';
    });
  });
  const fix = (a: any) => { if (a && a.type === 'goto' && !ids.has(a.target)) { a.type = 'none'; delete a.target; } };
  p.screens.forEach((s: any) => { s.elements.forEach((e: any) => fix(e.action)); s.keybinds.forEach((k: any) => fix(k.action)); });
  p.globals.forEach((g: any) => { g.id = g.id || uid(); g.action = g.action || { type: 'none' }; fix(g.action); g.only = (g.only || []).filter((x: string) => ids.has(x)); });
  if (!ids.has(p.start)) p.start = p.screens[0].id;
  return p as Project;
}

/** Serialize for saving. Field order is stable so diffs stay readable. */
export function serialize(p: Project, pretty = true): string {
  return JSON.stringify(p, null, pretty ? 2 : 0);
}
