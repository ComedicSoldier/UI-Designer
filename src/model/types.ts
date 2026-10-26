// Project file schema. Documented in docs/FORMAT.md; keep the two in sync.

export type ActionType = 'none' | 'goto' | 'back' | 'quit';
export interface Action {
  type: ActionType;
  /** Screen id, only for 'goto'. */
  target?: string;
}

export type Shape = 'rect' | 'round' | 'pill' | 'cut' | 'circle' | 'diamond' | 'hex';
export type ElType = 'button' | 'panel' | 'text' | 'shape';
export type Align = 'center' | 'left' | 'top-left';
export type Dir = 'up' | 'down' | 'left' | 'right';

export interface UIElement {
  id: string;
  type: ElType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  shape: Shape;
  /** CSS color or 'transparent'. */
  fill: string;
  stroke: string;
  /** Border width in px. */
  sw: number;
  /** Text color. */
  ink: string;
  /** Font size in px. */
  fs: number;
  align: Align;
  bold: boolean;
  /** Reachable with arrow keys / WASD. */
  focusable: boolean;
  action: Action;
  /** Shortcut key on this screen, e.g. 'Escape', 'I', 'Ctrl+S'. Empty = none. */
  key: string;
  /** What the element does in the real game. */
  note: string;
  /** Manual arrow-key routing; missing direction = nearest element. */
  nav: Partial<Record<Dir, string>>;
}

export interface Keybind {
  id: string;
  key: string;
  action: Action;
  /** Pressing the key while its target is on top closes it. */
  toggle: boolean;
  note: string;
}

export interface GlobalKey extends Keybind {
  /** Full-screen ids this key works on. Empty = every screen. */
  only: string[];
}

export type ScreenKind = 'full' | 'overlay';

export interface Screen {
  id: string;
  name: string;
  kind: ScreenKind;
  bg: string;
  /** Overlay backdrop opacity, 0..1. */
  dim: number;
  /** Group id or ''. */
  group: string;
  notes: string;
  keybinds: Keybind[];
  /** Back-to-front draw order. */
  elements: UIElement[];
  /** Element id selected when the screen opens, '' = top-left focusable. */
  defaultFocus: string;
  /** Pinned flowchart position. */
  fx?: number;
  fy?: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  format: 'comedical-ui';
  v: number;
  id: string;
  name: string;
  canvas: { w: number; h: number };
  start: string;
  screens: Screen[];
  globals: GlobalKey[];
  groups: Group[];
  anyPos?: { x: number; y: number };
}
