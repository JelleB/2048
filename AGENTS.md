# AGENTS.md — 2048 / 2248 (Phaser 3)

Guide for humans and coding agents working in this repo.

## Project summary

JavaScript browser game: **2048** (swipe merge) and **2248** (path link merge). Phaser 3 renders and handles input; **game rules live in `src/logic/`** and are covered by Vitest.

## Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm test` | Run Vitest once |
| `npm run test:coverage` | Vitest with coverage (testable modules ≥95%) |
| `npm run test:watch` | Vitest watch mode |
| `npm run dev` | Vite dev server (default http://localhost:5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve production build |

No Python venv in this repo (JS only).

## TDD workflow (required for logic changes)

**Use `/test-driven-development` whenever possible** — especially for `src/logic/` and `src/persistence/`. See [docs/testing.md](./docs/testing.md) for coverage map and how to add tests.

Follow Red → Green → Refactor:

1. **Red** — Add or change a test in `tests/test_*.js` for one behavior. Run `npm test`; expect failure.
2. **Green** — Minimal change in `src/logic/` until test passes.
3. **Refactor** — Clean names/duplication; re-run `npm test`.

Do **not** put core merge/move rules only inside Phaser scenes—scenes call logic modules.

Test naming: `test_Board2048.js`, `test_Board2248.js` mirror `src/logic/Board2048.js`, etc.

## File map

| Path | Role |
|------|------|
| `src/logic/Board2048.js` | 2048 grid, moves, score |
| `src/logic/Board2248.js` | 2248 paths, merges |
| `src/constants.js` | `GRID_2048`, `GRID_2248`, spawn rates |
| `src/scenes/*.js` | Phaser UI only |
| `src/main.js` | Phaser game config, responsive scale |
| `tests/` | Vitest unit tests |

## Adding a feature

1. Read `plan.md` for scope and rules.
2. Write failing test(s) first.
3. Implement logic; then wire scene if needed.
4. Run `npm test` and manual check in `npm run dev` (desktop + narrow viewport).
5. JSDoc on exported functions/classes (see workspace doc rules).

## Mobile / responsive checklist

- [ ] `Scale.FIT` + resize handler in `main.js`
- [ ] Swipe threshold on 2048 scene; no page scroll on game canvas
- [ ] 2248 drag uses cell hit areas sized from layout
- [ ] Menu buttons scale with game width

## Manual QA (before “done”)

1. Menu → 2048: arrow keys and swipe move tiles; merges and score update.
2. Fill board with no moves → game over UI.
3. Menu → 2248: drag path on matching numbers; release merges at end.
4. Chrome DevTools device mode ~375×667: board visible, controls usable.
5. `npm test` all green.

## Conventions

- ESM (`import` / `export`)
- No default export on logic modules (named exports for tests)
- Seeded RNG: `Board2048` / `Board2248` accept optional `rng()` in constructor for deterministic tests

## Common pitfalls

- Testing Phaser scenes instead of logic — avoid
- Weakening assertions to green — avoid
- 2048 double-merge in one line — one merge per pair per move only

## References

- [docs/testing.md](./docs/testing.md) — coverage map, how to write tests, TDD patterns
- [docs/architecture.md](./docs/architecture.md) — layers, scene flow, persistence, deploy
- [plan.md](./plan.md) — full design and milestones
- [Phaser 3 docs](https://photonstorm.github.io/phaser3-docs/)
- [Vitest](https://vitest.dev/)
