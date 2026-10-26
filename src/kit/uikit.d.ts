import type { Project, Screen, UIElement } from '../model/types';

export interface PlayInfo {
  stack: string[];
  top: Screen | null;
  focused: UIElement | null;
  ended: boolean;
}

export interface PlayerOptions {
  from?: string;
  hud?: boolean;
  isActive?: () => boolean;
  onChange?: (info: PlayInfo) => void;
}

export interface Player {
  restart(from?: string): void;
  destroy(): void;
  focus(): void;
}

export interface Kit {
  CSS: string;
  CLIP: Record<string, string>;
  renderEl(el: UIElement): HTMLElement;
  createPlayer(root: HTMLElement, project: Project, opts?: PlayerOptions): Player;
  keyLabel(key: string): string;
  normKey(e: KeyboardEvent): string | null;
}

export function UIKit(): Kit;
