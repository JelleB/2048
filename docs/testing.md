# Testing — 2048 / 2248

How unit tests are organized, what is already covered, and how to add new tests. For the required Red → Green → Refactor loop, agents should use the **test-driven-development** skill (`/test-driven-development`) whenever possible.

See also [AGENTS.md](../AGENTS.md) (commands and conventions) and [architecture.md](./architecture.md) (what to test vs what stays in Phaser scenes).

## Quick start

```bash
npm test              # run all tests once
npm run test:coverage # run tests with coverage report (≥95% on testable code)
npm run test:watch    # re-run on file changes
```

- **Framework:** [Vitest](https://vitest.dev/)
- **Config:** `vitest.config.js` — Node environment, `tests/**/*.js`
- **No Phaser in tests** — logic and persistence only; scenes are verified manually

## Where tests live

| Test file | Source module(s) | Focus |
|-----------|------------------|-------|
| `tests/test_Board2048.js` | `src/logic/Board2048.js` | Moves, merges, spawn, game over |
| `tests/test_Board2248.js` | `src/logic/Board2248.js` | Paths, gravity refill, rollback |
| `tests/test_pathMerge.js` | `src/logic/pathMerge.js` | Path rules and merge scoring |
| `tests/test_gravity.js` | `src/logic/gravity.js` | Column gravity and one-step preview |
| `tests/test_startTiles.js` | `src/logic/startTiles.js` | Spawn pools, tiers, purge |
| `tests/test_gameStorage.js` | `src/persistence/gameStorage.js` | Saves, high scores, resume |
| `tests/test_cookies.js` | `src/persistence/cookies.js` | Cookie read/write/delete |
| `tests/test_gamePersistence.js` | `src/scenes/gamePersistence.js` | Init, persist, New/Save helpers |
| `tests/test_layout.js` | `src/ui/layout.js` | Board layout and hit testing |

**Naming rule:** `tests/test_<ModuleName>.js` mirrors `src/logic/<ModuleName>.js` or `src/persistence/<ModuleName>.js`.

**Not unit-tested (by design):** Phaser scenes (`BootScene`, `MenuScene`, `Game2048Scene`, `Game2248Scene`), `src/ui/buttons.js`, `src/main.js` — use `npm run dev` and the manual QA checklist in [AGENTS.md](../AGENTS.md).

### Coverage target

`npm run test:coverage` measures **testable modules** only (`src/logic/`, `src/persistence/`, `src/scenes/gamePersistence.js`, `src/ui/layout.js`). Thresholds in `vitest.config.js`: **≥95%** lines/statements/functions, **≥90%** branches. Phaser scene files are excluded from the report.

## How to add a new test (TDD)

Use `/test-driven-development` for each behavior slice:

1. **Red** — Add one `it('…')` that names the behavior. Run `npm test`; confirm it fails for the right reason.
2. **Green** — Minimal change in `src/logic/` or `src/persistence/` until green.
3. **Refactor** — Clean up; `npm test` after each step.

### Minimal test template

```javascript
/**
 * Unit tests for <module purpose>.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MyModule } from '../src/logic/MyModule.js';

describe('MyModule', () => {
  beforeEach(() => {
    // fresh state per test
  });

  it('does one specific thing when condition holds', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Patterns used in this repo

**Seeded RNG** — boards accept `rng` in the constructor so spawns and fills are deterministic:

```javascript
const board = new Board2048({ rng: () => 0 });
// or queue: () => values[i++ % values.length]
```

**Set grid directly** — use `board.setGrid([...])` to arrange a position without playing moves.

**Persistence without cookies** — inject in-memory storage in `beforeEach` / reset in `afterEach`:

```javascript
import { setStorageAdapter, resetStorageAdapter } from '../src/persistence/gameStorage.js';

beforeEach(() => setStorageAdapter(createMemoryStorage()));
afterEach(() => resetStorageAdapter());
```

See `tests/test_gameStorage.js` for `createMemoryStorage()`.

### Test quality

- One behavior per `it`; name reads like a spec (`rejects path when values differ without valid ladder`).
- Prefer asserting **outcomes** (grid, score, return value) over internal details.
- Do not weaken assertions or mock away the code under test to force green.
- Cover happy path first, then edges and rejections the story cares about.

## Coverage by topic

### `test_Board2048.js` — classic 2048

- Empty 4×4 grid
- `start()` fills board with values in 2–16 range
- Weighted spawn (low vs high `rng`)
- Slide without merge; merge equal neighbors once
- No double-merge in one line per move
- No spawn when move changes nothing
- Spawn only after successful move
- `canMove()` / full board with no merges

### `test_Board2248.js` — path-link mode

- Empty 5×5 grid; `start()` fill range
- `canLink` (same value)
- Path length, adjacency (including diagonal), invalid ladders
- Merge outcomes and score (including double-rounding bonus)
- `refillUntilFull`, `spawnOneAndFall`, column spawn behavior
- `hasValidMove` true/false
- `tryRollbackPath` (penultimate cell only)
- Tier-nine purge of unspawnable tiles

### `test_pathMerge.js` — pure path rules

- Valid/invalid paths (step-up = ×2, minimum duplicates before step up)
- Partial path validation while dragging
- `computePathMergeScore` (exact merge and double-rounding bonus)

### `test_gravity.js` — column physics

- `applyGravity` drops tiles and preserves order
- `applyGravityOneStep` + preview helpers (used by 2248 animations)
- `isGravitySettled`

### `test_startTiles.js` — spawn pools and tiers

- Exponent tiers for board max (up through tier 11)
- 256:1 lowest-to-highest weight ratio
- `randomSpawnTileValue` bias with extreme `rng`
- `purgeUnspawnableTiles` at tiers 9–11
- `roundUpToPowerOfTwo`

### `test_gameStorage.js` — cookies / save-load

- Per-mode high scores
- Save/load unfinished games; clear on `gameOver`
- Invalid JSON rejection
- `getResumeTarget` and `last_active_mode`
- `applySnapshot` onto boards; guard when `grid` missing
- `clearSavedGame` per mode only

## Adding a new feature — checklist

```
- [ ] Decide module: logic (`src/logic/`) or persistence (`src/persistence/`)
- [ ] Red: failing test in matching `tests/test_*.js`
- [ ] Green: minimal implementation
- [ ] Refactor if needed; all tests green
- [ ] Wire Phaser scene if UI-only; manual QA in `npm run dev`
- [ ] Update this doc if you add a new test file or major topic area
```

## When to skip or lighten unit tests

- Exploratory spikes (time-box; add tests before merge).
- Thin scene glue (button layout, tweens) — manual QA instead.
- E2E browser automation — not set up in this repo.

Core rules (merges, spawns, scores, saves) should always go through the TDD loop.
