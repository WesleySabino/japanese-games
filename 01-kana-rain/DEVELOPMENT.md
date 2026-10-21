# Development

Use [README](README.md) for setup and the full check sequence, [SPECIFICATION](SPECIFICATION.md) for the playable contract, [NOVELTY_BALANCE](NOVELTY_BALANCE.md) for admission transitions, and [LEARNING_DESIGN](LEARNING_DESIGN.md) for evidence and pedagogical limits. This handoff covers implementation and maintenance contracts.

The app is static HTML, CSS and JavaScript. Source previews load `data`, `learner`, `audio`, `sfx`, `difficulty`, `novelty`, then `game`; the production bundle preserves that order. The game awaits `Learner.ready` before reading saved state. Keep the `window.KanaRain` module boundary (`generateRound`, `render`, `score`, `dispose` and session controls) available to integration tests. `score` decorates evidence; it is not a point-scoring system.

Preserve these runtime invariants:

- Schedule animation frames only for active play or countdowns. Pause, hidden tabs and disposal stop the loop; resuming starts with a fresh frame clock. Simulation and pending-input delays use active time.
- Cache field and sprite dimensions with `ResizeObserver`. Geometry reads during creation or resizing are legitimate; avoid repeated layout reads in the frame loop.
- Rebuild progress panels only when dirty and visible. Build the fixed sound pad once, then update its stage. Update HUD text and classes only when their visible values change.
- Animate decorative rain with transforms and freeze it outside active play. Preserve reduced-effects and viewport/safe-area behavior when changing visuals.

Persistence belongs to `src/learner.js`. Retain the `jp-learner-v1` key, schema-v2 export, IndexedDB database `kana-garden` version 1 and its `learner` store. Bootstrap reads the journal, then accepts a newer IndexedDB snapshot by `updatedAt`. Schema-v1 migration keeps legacy aggregates without fabricating independent evidence. Preserve old attempts, exposures, retired-mode facets, earned rows, accuracy, historical point records and additive game-data fields when normalizing settings.

Attempt/exposure IDs are indexed for idempotency and rebuilt on import/reload. Do not truncate their ledgers; the bounded error log is a derived diagnostic. Game recording defers the individual learner save, updates related game data, then flushes together. One serialization supplies the journal and an immutable IndexedDB snapshot. Save status must reflect successful writes, including transaction completion, and an older transaction must not replace the latest failure state. Keep the in-memory/export fallback when both backends fail.

Asset regeneration is explicit and writes tracked outputs:

| Command | Purpose |
|---|---|
| `pnpm assets` | Extract/compress the garden and sprite masters using `scripts/prepare-assets.cjs`; review generated-image diffs. |
| `node scripts/prepare-runtime-audio.cjs` | Regenerate the compact lookup from the catalogue and approved source manifest. Add `--check` to verify it without writing. |
| `node scripts/build.cjs --check` | Validate the production plan, local references and audio correspondence without replacing `dist/`. |

Keep artwork masters/prompts and the complete audio manifests, recordings, licenses and provenance. The compact runtime lookup selects gameplay recordings; unused source recordings are not permission to discard provenance.

`scripts/build.cjs` owns the production allowlist. It emits the ordered runtime, inlines/rebases home-page styles, and copies the public pages and approved assets. Source CSS remains necessary for other public pages. Deploy the contents of `dist/`; building does not publish. Keep private exports, tests and artifacts outside the allowlist.

Coordinate packaging with `sw.js`: its shell supports source previews, conditionally caches the production bundle, and downloads unique audio files with bounded concurrency. Keep release cache names synchronized with runtime/asset releases. Cache navigation destinations separately, preserve canonical page aliases, and normalize cached redirected HTML responses on offline navigation without dropping status or headers. A missing offline destination must not silently become another page.

Game analytics have a strict schema:

| Event | Game payload |
|---|---|
| `practice_start` | `practice_mode`: `hira`, `kata` or `review` |
| `practice_complete` | The same mode plus `completion_reason`: `timer_elapsed`, `hearts_lost` or `manual_finish` |

Start fires once when the initial countdown completes; pause/resume does not repeat it. Completion requires a started session; disposal alone emits nothing. The shared client also accepts `completed`, which this game does not emit. Keep consent/host checks and exact-key/enum validation in `assets/nihongo-analytics.js`. Page metadata uses approved routes without query strings/fragments and origin-only referrers. Never add responses, counts, item IDs or learner history to analytics payloads.

Useful focused checks are `pnpm test:performance`, `pnpm test:analytics`, and `pnpm test:katakana-bridge` (which includes cold-start, legacy-save and feedback regressions). `tests/input.browser.cjs` is exercised by `test:browser`. Run the README's complete sequence before release; CI runs Node tests, six browser suites and the build. Browser suites use Playwright Chromium unless `PLAYWRIGHT_BROWSER_CHANNEL` selects an installed channel. Use disposable synthetic profiles, keep owned server ports free, and close contexts/servers after checks; offline tests intentionally exercise service workers.

The optional `node tests/runtime-browser.benchmark.cjs` compares runtime counters against `KANA_RAIN_BASELINE_URL` or the current public release; it defaults to installed Chrome. Its public baseline changes after publication. Node persistence diagnostics measure CPU work and test doubles, not real IndexedDB disk latency. Browser/Lighthouse results also depend on browser, device, server and network conditions; do not attribute hosting latency or injected third-party script warnings to game code without isolating them. Avoid concurrent browser work while measuring. Reports/screenshots belong in ignored `tests/artifacts/`; private release evidence belongs in the repository's ignored `.release/` directory.

Keep the working tree focused on the current game, reproducible source assets, development tools and meaningful regression fixtures. Update the canonical documents above when behavior changes; use the changelog and Git history for past decisions rather than retaining parallel specifications or presentation decks. Periodically remove generated reports and obsolete local snapshots, while retaining the current deployment binding, a recent rollback and any files used by a running preview. A legacy-save fixture or compatibility branch is still necessary when it protects existing player progress.
