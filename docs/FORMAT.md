# Project file format (`.cuid.json`)

This is the contract between the designer and anything that reads its files, starting with the Unity importer. The TypeScript source of truth is `src/model/types.ts`; keep both in sync.

## Versioning

- `format` is always `"comedical-ui"`.
- `v` is an integer. The app writes `FORMAT_VERSION` (currently **1**).
- Opening an older file runs it through `MIGRATIONS` in `src/model/format.ts`, one version at a time.
- Opening a newer file is refused with a message to update the app. Readers (the Unity importer included) should do the same.
- Any change to the saved shape bumps `v` and adds a migration step. Adding an optional field that defaults safely also counts.

## Coordinates

All positions and sizes are in pixels of the project canvas (`canvas.w` × `canvas.h`). The origin is top-left and y grows downward. Unity's uGUI has y growing upward, so the importer flips it: `anchoredY = -y` with a top-left anchor.

## Top level

| Field | Type | Notes |
|---|---|---|
| `format` | `"comedical-ui"` | |
| `v` | int | File version |
| `id` | string | Stable project id |
| `name` | string | |
| `canvas` | `{ w, h }` | Reference resolution |
| `start` | screen id | First screen shown |
| `screens` | Screen[] | |
| `globals` | GlobalKey[] | Keys that work across screens |
| `groups` | Group[] | Color-coding only |
| `anyPos` | `{ x, y }`? | Flowchart position of the Global keys node |

## Screen

| Field | Type | Notes |
|---|---|---|
| `id`, `name` | string | |
| `kind` | `"full"` \| `"overlay"` | An overlay draws on top of the current screen |
| `bg` | color | Full screens only |
| `dim` | 0..1 | Overlay backdrop opacity |
| `group` | group id or `""` | |
| `notes` | string | |
| `keybinds` | Keybind[] | Only active while this screen is on top |
| `elements` | Element[] | Back-to-front draw order |
| `defaultFocus` | element id or `""` | `""` means the top-left focusable element |
| `fx`, `fy` | number? | Pinned flowchart position (editor only) |

## Element

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `type` | `"button"` \| `"panel"` \| `"text"` \| `"shape"` | Editor preset; behavior comes from the fields below |
| `x`, `y`, `w`, `h` | number | Canvas pixels |
| `label` | string | May contain `\n` |
| `shape` | `rect` `round` `pill` `cut` `circle` `diamond` `hex` | |
| `fill`, `stroke`, `ink` | color | `"transparent"` allowed for fill and stroke |
| `sw` | number | Border width |
| `fs` | number | Font size in canvas pixels |
| `align` | `center` \| `left` \| `top-left` | Label placement |
| `bold` | bool | |
| `focusable` | bool | Reachable with arrow keys |
| `action` | Action | What activating it does |
| `key` | key string | Shortcut on this screen, `""` for none |
| `note` | string | Intended real function |
| `nav` | `{ up?, down?, left?, right? }` | Element ids; a missing direction means nearest |

## Action

`{ "type": "none" }`, `{ "type": "back" }`, `{ "type": "quit" }`, or `{ "type": "goto", "target": "<screen id>" }`.

## Keybind and GlobalKey

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `key` | key string | |
| `action` | Action | |
| `toggle` | bool | Pressing again while the target is on top closes it |
| `note` | string | |
| `only` | screen id[] | GlobalKey only. Full screens it works on; empty means every screen |

## Key strings

Modifiers come first, joined with `+`: `Ctrl`, `Alt`, `Shift`. Shift is only recorded for non-character keys. The base key is an uppercase letter or digit for single characters (`I`, `M`, `1`), `Space`, or a browser `KeyboardEvent.key` name (`Escape`, `Enter`, `Tab`, `ArrowUp`, `F1`). Examples: `Escape`, `I`, `Ctrl+S`, `Shift+Tab`.

## Runtime rules

The importer has to reproduce these for the result to feel the same as Play mode:

1. A key press checks, in order, element shortcuts on the top screen, then the top screen's keybinds, then global keys whose `only` is empty or includes the current base full screen.
2. Going to a screen already in the history truncates back to it instead of pushing a copy.
3. A global key that opens an overlay while another overlay is on top replaces it.
4. Back pops one level. It does nothing at the root.
5. Arrow keys and WASD move focus using `nav` when it is set, otherwise to the nearest focusable element in that direction. Enter or Space activates.
