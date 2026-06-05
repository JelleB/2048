# 2048 / 2248 — Phaser 3 Game Plan

## Goal

Browser game with two modes:

| Mode | Mechanic | Win / lose |
|------|----------|------------|
| **2048** | Swipe (keyboard + touch) slides all tiles; equal neighbors merge once per move; spawn 2 (90%) or 4 (10%) on empty cell | Reach 2048 tile (optional win); game over when no moves |
| **2248** | Drag through adjacent cells (8-dir) linking same value or valid double chain; path merges into one tile at end; refill spawns | Chain length ≥ 2 to merge; game over when board full and no valid chain |

UI must scale on mobile (portrait/landscape, touch-first).

## Success criteria

- [ ] `npm test` — all unit tests green
- [ ] `npm run dev` — menu picks 2048 or 2248; both playable
- [ ] 2048: moves, merges, spawn, score, game over match tests
- [ ] 2248: path validation, merge at endpoint, spawn, game over match tests
- [ ] Viewport &lt; 768px: board fits, no horizontal scroll; swipe/drag work
- [ ] `AGENTS.md` documents commands and TDD loop

## Stack

| Piece | Choice | Why |
|-------|--------|-----|
| Runtime | Phaser 3.80+ | Canvas game, touch, scale modes |
| Bundler | Vite 5 | Fast dev, ESM |
| Tests | Vitest | Same ESM as Vite; no browser for logic |
| Logic | Pure JS modules | TDD without Phaser in tests |

Phaser scenes only render + input; **board state lives in testable modules**.

## Repository layout

```
2048/
├── plan.md                 # this file
├── AGENTS.md               # agent / dev workflow
├── package.json
├── vite.config.js
├── vitest.config.js
├── index.html
├── src/
│   ├── main.js             # Phaser config, scale, boot
│   ├── constants.js        # grid size, colors, spawn odds
│   ├── logic/
│   │   ├── Board2048.js    # grid, move, merge, spawn, score
│   │   └── Board2248.js    # grid, path, merge chain, spawn
│   └── scenes/
│       ├── BootScene.js
│       ├── MenuScene.js
│       ├── Game2048Scene.js
│       └── Game2248Scene.js
└── tests/
    ├── test_Board2048.js
    └── test_Board2248.js
```

## TDD slices (Red → Green → Refactor)

### Board2048

1. Empty 4×4 grid init
2. `spawn()` places 2 or 4 on random empty (seeded RNG in tests)
3. `move('left')` — tiles slide, no merge
4. Merge equal neighbors once per line per move
5. No move when grid unchanged → no spawn
6. Score += merged values
7. `canMove()` / `isGameOver()`
8. Refactor: shared direction helpers

### Board2248

1. Empty grid init (5×5 default for 2248 feel)
2. `canLink(a, b)` — same value OR chain doubling rule
3. `applyPath(cells)` — length &lt; 2 → reject; merge sum at last cell; clear path
4. `spawn()` after valid path
5. `hasValidMove()` / game over
6. Refactor: path validator

### Phaser (after logic green)

1. Boot + scale FIT / CENTER_BOTH, resize listener
2. Menu — two buttons, font scales with `width`
3. Game2048Scene — draw grid, swipe threshold, keyboard
4. Game2248Scene — drag line on grid, highlight path
5. HUD — score, back, game over overlay

### Mobile / responsive

- `index.html`: `viewport` meta, `touch-action: manipulation`, full-height `#game`
- Phaser: `Scale.FIT`, min/max width hooks, cell size = `min(availW, availH) / (N+1)`
- Touch: 2048 swipe &gt; 30px; 2248 pointer down/move/up on cells
- Safe area: padding from `visualViewport` when available

## 2048 rules (implementation detail)

- Grid: 4×4, values powers of 2
- One move = one direction; all rows/columns processed in move order (away from wall)
- Merge: each pair merges once per line (standard 2048 compression)
- After successful move: one spawn
- Initial: two spawns at start

## 2248 rules (implementation detail)

- Grid: 5×5 (configurable constant)
- Player draws path through adjacent cells (including diagonals)
- Adjacent cells in path must share the same value (classic 2248 link)
- On release: if path length ≥ 2, sum all values in path → single tile at **last** cell with that sum; other path cells cleared; then spawn one new tile (2 or 4)
- Invalid path: no state change

## Testing commands

```bash
npm install
npm test          # vitest run
npm run test:watch
npm run dev       # vite dev server
npm run build
```

## Risks / tradeoffs

| Risk | Mitigation |
|------|------------|
| Phaser hard to unit test | Keep logic outside scenes |
| 2248 rules vary by clone | Document chosen rule in tests; adjust tests if product owner disagrees |
| Touch vs scroll | `touch-action: none` on canvas parent during play |

## Out of scope (v1)

- Persistence / high scores
- Animations beyond simple tweens
- Sound
- PWA / offline

## Milestone order

1. Tooling + Vitest + empty tests passing
2. Board2048 full TDD
3. Board2248 full TDD
4. Phaser boot, menu, 2048 scene
5. 2248 scene + mobile polish
6. Manual QA checklist in AGENTS.md
