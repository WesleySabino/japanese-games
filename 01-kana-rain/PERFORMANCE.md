# Kana Rain — performance audit

10 October 2026. Version 1.3.0 preserves Arcade as the default, optional Steady practice, existing progress, approved audio and the learning evidence rules.

## Measured issues and fixes

| Issue | Change | Evidence |
|---|---|---|
| Animation callbacks continued in pause | Suspend requestAnimationFrame in pause, hidden tabs, introductions and practice corrections; wake on countdown/resume | 192 callbacks during a 1.5-second pause became 0 |
| Layout dimensions were read every frame | Observe field/drop geometry outside the animation loop | Field reads in 5 seconds: 1,437 → 0; drop reads: 2,114 → 4 |
| Hidden progress panels and unchanged keyboards were rebuilt | Render progress when opened and retain the keyboard when its format/pool is unchanged | Three answers: map/prerequisite rebuilds 3 → 0; keyboard rebuilds 4 → 0 |
| Decorative rain repainted the viewport | Animate transform; freeze decoration in menu, pause and hidden tabs | Chrome verified the paused/running states and visual layouts |
| Every answer saved the entire history twice | Save attempt and accuracy together, reuse serialization and index identifiers with Sets | Eight responses: journal writes 16 → 8; stringify calls 32 → 8 |
| Startup had two render-blocking stylesheets and six core script requests | Inline/rebase the production styles and emit one ordered runtime bundle | Production test and browser verify styles, relative assets and module order |
| Full audio provenance was loaded just to look up recordings | A 5,075-byte runtime lookup retains all 216 symbols and 112 unique recordings | The complete 193,261-byte manifest, licenses and provenance remain bundled |
| Companion sprite used excess transfer bytes | Generate the same four-pose atlas at 512 pixels, WebP quality 82 | 103,104 → 59,134 bytes; source master preserved |
| Playfield had an unsupported accessible label | Give the named playfield an explicit group role | Lighthouse/accessibility and production checks |

The persistence benchmark with 10,000 attempts fell from 76.44 to 13.35 ms for journal-only saves. With a synchronous structured-clone IndexedDB double, it fell from 198.40 to 67.97 ms. These are Node CPU diagnostics, not measurements of real IndexedDB disk latency. No history is truncated, and each accepted game response still reaches its durable save immediately.

## Verification

- 61 Node checks: content, learning, migration, save failure, analytics, runtime counters and production packaging.
- Complete Chrome arcade regression: desktop, seven phone sizes, input, pause/resume, resize, difficulty, progress, audio and offline use.
- 14 focused improvement browser checks.
- Production-bundle smoke test: inline styles, relative images, default Arcade, real answer input, compact audio lookup and offline shell with all 112 recordings.
- Google Lighthouse 13.5.0, headless Chrome, default mobile simulated throttling and the desktop preset. Production measurements use fresh browser/storage contexts; reports are retained locally.

The public baseline's three mobile performance scores were 74, 71 and 94 (median 74); desktop was 100. Server response time varied from 42 to 2,198 ms, so the score alone cannot attribute the entire change to application code. Deprecated-API warnings originated in Cloudflare's injected challenge script, outside the game source. Security settings are preserved.

With both static builds served by the same local compressed HTTP server, one controlled mobile run measured:

| Measure | Before | Optimized |
|---|---:|---:|
| Performance score | 89 | 92 |
| First Contentful Paint | 0.91 s | 0.81 s |
| Largest Contentful Paint | 3.77 s | 3.30 s |
| Speed Index | 1.03 s | 0.81 s |
| Total Blocking Time | 0 ms | 0 ms |
| Initial transfer | 483,326 B | 414,050 B |
| Page requests | 16 | 9 |

This separates client changes from public hosting latency, but remains a lab sample rather than a guarantee for every device or connection.

## Reproduce

Run `pnpm test`, `pnpm test:performance`, `pnpm test:browser`, `pnpm test:improvements`, and `pnpm build` in this directory. Chromium is used in CI; set `PLAYWRIGHT_BROWSER_CHANNEL=chrome` to use an installed desktop Chrome. The optional `node tests/runtime-browser.benchmark.cjs` compares DOM/RAF counters against a supplied or default baseline; the public baseline changes after publication.

Run `pnpm dlx lighthouse@13.5.0 https://kana-rain.nihongogrove.top/ --chrome-flags="--headless" --output=json --output=html --output-path=rain-mobile` for a fresh mobile audit. Add `--preset=desktop` for desktop. Avoid concurrent browser tests while measuring.

Regenerate the compact lookup with `node scripts/prepare-runtime-audio.cjs`; `--check` verifies exact correspondence. `pnpm assets` reproduces sprite preparation. Browser screenshots and measurements stay under ignored `tests/artifacts/`; publication archives and Lighthouse reports stay in the ignored repository `.release/` directory.
