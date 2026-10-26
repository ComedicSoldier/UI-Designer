import { R, ui, type Mode } from './state';
import { stopPlayer } from './play';

export function setMode(m: Mode): void {
  if (ui.mode === m) return;
  stopPlayer();
  ui.mode = m;
  if (m === 'flow') ui.flowSel = ui.screen;
  R.all();
}
