# Architecture — 2048 / 2248

High-level structure of the Phaser 3 browser game: how layers connect, where state lives, and how data flows at runtime.

For day-to-day commands and TDD workflow, see [AGENTS.md](../AGENTS.md). For product rules and milestones, see [plan.md](../plan.md).

## Design principle

**Logic is pure JavaScript; Phaser is presentation and input.**

Board rules, scoring, spawn pools, path validation, and gravity run in `src/logic/` with no Phaser imports. Scenes call into logic modules and mirror grid state onto rectangles and text. Vitest tests logic only—no canvas, no scene boot.

```
┌─────────────────────────────────────────────────────────┐
│  index.html → src/main.js (Phaser config + scale)       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Scenes (src/scenes/) — input, layout, tweens, overlays   │
│  Boot → Menu → Game2048 | Game2248 | GameKnoppenspel      │
└───────────────────────────┬─────────────────────────────┘
                            │ calls
┌───────────────────────────▼─────────────────────────────┐
│  Logic (src/logic/) — boards, merges, spawn, gravity      │
│  Board2048, Board2248, pathMerge, startTiles, gravity     │
└───────────────────────────┬─────────────────────────────┘
                            │ optional
┌───────────────────────────▼─────────────────────────────┐
│  Persistence (src/persistence/) — cookies, save/load      │
└─────────────────────────────────────────────────────────┘
```

## Runtime stack

| Layer | Technology | Role |
|-------|------------|------|
| Bundler | Vite 5 | Dev server, ESM, production build to `dist/` |
| Game engine | Phaser 3.80+ | Scenes, input, tweens, responsive `Scale.FIT` |
| Tests | Vitest | Unit tests for logic and persistence |
| Hosting | GitHub Pages | CI builds `dist/` on push to `main` |

Base path for Pages: `/stunning-tribble/` (set via `BASE_PATH` in `.github/workflows/deploy-pages.yml`).

## Scene flow

```
BootScene
  ├─ cookie has unfinished game? → Game2048 or Game2248
  └─ else → MenuScene
        ├─ Play 2048 → Game2048Scene
        ├─ Play 2248 → Game2248Scene
        └─ Play Knoppenspel → GameKnoppenspelScene
```

| Scene | Responsibility |
|-------|----------------|
| `BootScene` | Resume last unfinished save or open menu |
| `MenuScene` | Mode picker; shows per-mode high scores |
| `Game2048Scene` | Arrow keys + swipe; syncs tiles after `board.move()` |
| `Game2248Scene` | Drag path; animated gravity/refill after merge |
| `GameKnoppenspelScene` | 8-bit LED match; shrinking timer; reveal overlay on correct/wrong |

Scenes rebuild UI on resize (`buildUi()`). Game scenes use `computeBoardLayout()` from `src/ui/layout.js` for cell size and board offset.

**Do not pass save state through `scene.start(data)`** — Phaser may deliver an empty object to `create()`. Game scenes always restore from cookies via `initBoardFromStorage()` in `src/scenes/gamePersistence.js`.

## Logic modules

### `Board2048` (`src/logic/Board2048.js`)

- 4×4 grid (`GRID_2048`)
- Cardinal moves: slide, merge equal neighbors once per line per move
- Spawn after each successful move; tier-based spawn pool and purge via `startTiles.js`
- Score on merge; optional injected `rng()` for tests

### `Board2248` (`src/logic/Board2248.js`)

- 5×5 grid (`GRID_2248`)
- Path merge: non-decreasing values; step up = exactly ×2; first step up from start needs ≥2 of start value
- Merge score from `pathMerge.js` (`2×rounded − sum`)
- Column gravity (`gravity.js`); scene animates one-row steps and one-at-a-time refill

### Shared helpers

| Module | Purpose |
|--------|---------|
| `startTiles.js` | Weighted spawn exponents, tier purge, `roundUpToPowerOfTwo` |
| `pathMerge.js` | Path validation (partial + complete), merge score |
| `gravity.js` | Column settle, one-step preview for tweens |
| `constants.js` | Grid sizes, swipe threshold, animation timings, spawn tier constants |
| `knoppenspel.js` | 8-bit round generation, scoring phases, shrinking timer |
| `binaryDisplay.js` | Byte ↔ MSB-left LED bits, reveal label formatting |

## UI layer

| Module | Purpose |
|--------|---------|
| `src/ui/layout.js` | Board layout, pointer→cell, tile colors |
| `src/ui/buttons.js` | Shared rounded button helper |

Game HUD (both modes): title, score + best, **New** / **Save**, back to menu, then board.

## Persistence

Cookie-backed client storage (`src/persistence/`). No server.

| Cookie key | Content |
|------------|---------|
| `game2048_highscore` / `game2248_highscore` / `game_knoppenspel_highscore` | Best score per mode |
| `game2048_save` / `game2248_save` | JSON snapshot: `version`, `mode`, `grid`, `score`, `gameOver` |
| `last_active_mode` | Which mode to prefer on resume |

**Lifecycle**

1. After each move/merge, scenes call `autoPersist()` → updates high score if needed and writes unfinished save.
2. **Save** button writes the same snapshot explicitly.
3. **New** clears the mode’s save cookie and calls `board.start()`.
4. Game over clears the save slot; high score is kept.
5. Page load: `BootScene` → `getResumeTarget()` reads cookies and starts the matching game scene.

`gameStorage.js` exposes an injectable storage adapter for Vitest (`tests/test_gameStorage.js`).

## Testing strategy

| Area | Location | Notes |
|------|----------|-------|
| Board rules | `tests/test_Board2048.js`, `test_Board2248.js` | Seeded `rng` where randomness matters |
| Path / gravity / spawn | `test_pathMerge.js`, `test_gravity.js`, `test_startTiles.js` | Pure functions |
| Persistence | `test_gameStorage.js` | In-memory adapter, no `document` |

Scenes are not unit-tested. Manual QA: menu, both modes, mobile viewport, resume after refresh (see [AGENTS.md](../AGENTS.md)). Full coverage map and how to add tests: [testing.md](./testing.md).

## Build and deploy

```
npm run dev     → Vite dev server (base `/`)
npm run build   → dist/ (BASE_PATH=/stunning-tribble/ in CI)
npm test        → Vitest
```

GitHub Actions (`.github/workflows/deploy-pages.yml`): `npm ci` → production build (`--base /stunning-tribble/`) → `actions/deploy-pages`. The workflow also copies `dist/index.html`, `dist/assets/`, and `.nojekyll` to the **repository root on `main`**, because GitHub’s `pages-build-deployment` serves branch root files at `/stunning-tribble/`. Develop on **`dev`** using `index.source.html` (`npm run dev`); **`main`** root `index.html` is the production bundle (updated by CI). Do not run `npm run build` on `main` without `index.source.html`.

## Extension points

| Change | Where to start |
|--------|----------------|
| New merge rule | `src/logic/` + failing test in `tests/` |
| New game mode | New `Board*.js`, scene, menu entry, cookie keys in `gameStorage.js` |
| UI only | Scene `buildUi()` / `src/ui/` |
| Save format bump | `STORAGE_VERSION` in `gameStorage.js`; handle migration in `parseSavedGame()` |

## File map (current)

```
src/
├── main.js
├── constants.js
├── logic/
│   ├── Board2048.js
│   ├── Board2248.js
│   ├── startTiles.js
│   ├── pathMerge.js
│   └── gravity.js
├── scenes/
│   ├── BootScene.js
│   ├── MenuScene.js
│   ├── Game2048Scene.js
│   ├── Game2248Scene.js
│   └── gamePersistence.js
├── persistence/
│   ├── cookies.js
│   └── gameStorage.js
└── ui/
    ├── layout.js
    └── buttons.js

tests/          # Vitest mirrors logic/persistence modules
docs/
└── architecture.md   # this file
```
