# Persistence compatibility fixture

## Smoother-save baseline 1.12.0

`learner-1.12.0.js` is the unchanged learner from the 1.12.0 release (`3b6024aa7c32206770b5d09f207774eb725ad07f`). Its LF-normalized SHA-256 is `11c250e1e483920d2e2dff3ed64bdcbf6fa3fd3fe65b7fbf43de147f21f7688d`. It contains only source and is never shipped. `save-batching.test.cjs` checks synchronous journals, shared queued commits, changes during a transaction, rejected locks and JSON-compatible private snapshot copying against this baseline.

`learner-1.10.2.js` is the original learner from this repository at commit `6bdf542` (`01-kana-rain/src/learner.js`). It is retained only to test an old runtime closing or writing during an upgrade; it is not shipped in the game.

SHA-256 after normalizing CRLF to LF: `b908462e680bf53855f36a68ab6d66dc60b0fea4d9e3758d124094bb8846fa5d`.

The native suite creates its own synthetic learner history. This file contains source code only, with no player data. Historical complete-release fixtures are documented separately in `releases/README.md`.

## Consolidation baseline 1.11.1

`learner-1.11.1.js` is the unmodified learner from release commit `b94d900e95a41a4954f6bb45a66ef3556fbda9da` (`01-kana-rain/src/learner.js`). It pins the pre-optimization behavior for differential regressions and the native save diagnostic; it is not shipped in the game and contains no player history.

SHA-256 after normalizing CRLF to LF: `cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72`.

Run `node tests/save-performance.browser.cjs --baseline` for this fixed source and run the same script without arguments for current code. Reports are kept separately in ignored `tests/artifacts/save-performance/baseline/` and `candidate/`; both use the same generated fixture sizes and native storage scenarios.
