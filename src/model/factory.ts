import type { ElType, Screen, UIElement } from './types';

export const uid = (): string => Math.random().toString(36).slice(2, 10);

export const SWATCH = ['#0e1016', '#1c2030', '#2b3550', '#46628f', '#79a6de', '#eef1f6', '#98a1b5', '#e3b04e', '#d9643a', '#c23c4d', '#5aa977', '#8a6dd0'];
export const GROUP_COLORS = ['#4a86d8', '#e0a63a', '#8a6dd0', '#c94a5a', '#4fa978', '#3fb0b8', '#d9733a'];
export const SIZES: [number, number, string][] = [
  [1280, 720, '1280 × 720 (16:9)'],
  [1920, 1080, '1920 × 1080 (16:9)'],
  [1024, 768, '1024 × 768 (4:3)'],
  [800, 1280, '800 × 1280 (tablet, tall)'],
  [390, 844, '390 × 844 (phone)'],
];

type Preset = Pick<UIElement, 'label' | 'w' | 'h' | 'shape' | 'fill' | 'stroke' | 'sw' | 'ink' | 'fs' | 'align' | 'bold' | 'focusable'>;

export const PRESET: Record<ElType, Preset> = {
  button: { label: 'Button', w: 280, h: 56, shape: 'round', fill: '#2b3550', stroke: '#46628f', sw: 2, ink: '#eef1f6', fs: 22, align: 'center', bold: false, focusable: true },
  panel: { label: 'Panel', w: 420, h: 280, shape: 'round', fill: '#1c2030', stroke: '#2b3550', sw: 2, ink: '#98a1b5', fs: 16, align: 'top-left', bold: true, focusable: false },
  text: { label: 'Heading', w: 360, h: 64, shape: 'rect', fill: 'transparent', stroke: 'transparent', sw: 0, ink: '#eef1f6', fs: 36, align: 'left', bold: true, focusable: false },
  shape: { label: '', w: 120, h: 120, shape: 'circle', fill: '#46628f', stroke: 'transparent', sw: 0, ink: '#eef1f6', fs: 16, align: 'center', bold: false, focusable: false },
};

export function mkEl(type: ElType, x: number, y: number, over: Partial<UIElement> = {}): UIElement {
  return { id: uid(), type, x, y, ...structuredClone(PRESET[type]), action: { type: 'none' }, key: '', note: '', nav: {}, ...over };
}

export function mkScreen(name: string, over: Partial<Screen> = {}): Screen {
  return { id: uid(), name, kind: 'full', bg: '#12141b', dim: 0.55, group: '', notes: '', keybinds: [], elements: [], defaultFocus: '', ...over };
}
