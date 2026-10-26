# Comedical UI Designer

Design game and app menus, wire buttons and keybinds between them, see the whole flow as a chart, and play it with real keyboard navigation. A Comedical Studios tool.

- **Design**: drag buttons, panels, text, and shapes onto screens. Screens are full screen or overlay (pause menus, inventories).
- **Keys at three levels**: element shortcuts, per-screen keys, and global keys that can be limited to one screen. Menus reachable only by keybind are supported.
- **Flowchart**: generated from the links, with dead ends and unreachable screens flagged.
- **Play**: arrow keys/WASD navigation, Enter to select, Back closes overlays.
- **Export**: project file (`.cuid.json`), a single-file playable prototype (`.html`), and the flowchart (`.svg`).

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

`npm run build` type-checks and writes the static site to `dist/`.

## Publishing

Every push to `main` builds and deploys to GitHub Pages through `.github/workflows/pages.yml`. One-time setup: in the repo on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.

## Project layout

```
src/
  model/      Project types, defaults, file format + migrations, example project
  kit/        Player and element renderer (self-contained; embedded in exported prototypes)
  editor/     Editor UI: state/undo, design canvas, flowchart, play mode, inspector, menus
  main.ts     Wiring and boot
docs/
  FORMAT.md   Project file spec (the contract for the Unity importer)
```

## Keyboard

| Keys | Action |
|---|---|
| 1 / 2 / 3 | Design / Flowchart / Play |
| Ctrl+S | Save project file |
| Ctrl+O | Open project file |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+D | Duplicate element |
| Delete | Delete element |
| Arrows (+Shift) | Nudge element |
| Right-drag | Move the flowchart view |

## Roadmap

1. ~~Web version in a real codebase, versioned file format~~
2. Desktop app (Tauri): native save/open, `.cuid.json` file association
3. Unity importer: generate uGUI prefabs and UI Toolkit UXML with navigation and keybinds wired
4. Multi-select and alignment tools, slider/toggle/tab widgets
