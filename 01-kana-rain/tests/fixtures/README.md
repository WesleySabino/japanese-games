# Persistence compatibility fixture

`learner-1.10.2.js` is the original learner from this repository at commit `6bdf542` (`01-kana-rain/src/learner.js`). It is retained only to test an old runtime closing or writing during an upgrade; it is not shipped in the game.

SHA-256 after normalizing CRLF to LF: `b908462e680bf53855f36a68ab6d66dc60b0fea4d9e3758d124094bb8846fa5d`.

The native suite creates its own synthetic learner history. This file contains source code only, with no player data. Historical complete-release fixtures are documented separately in `releases/README.md`.

## Consolidation baseline 1.11.1

`learner-1.11.1.js` is the unmodified learner from release commit `b94d900e95a41a4954f6bb45a66ef3556fbda9da` (`01-kana-rain/src/learner.js`). It pins the pre-optimization behavior for differential regressions and the native save diagnostic; it is not shipped in the game and contains no player history.

SHA-256 after normalizing CRLF to LF: `cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72`.

Run `node tests/save-performance.browser.cjs --baseline` for this fixed source and run the same script without arguments for current code. Reports are kept separately in ignored `tests/artifacts/save-performance/baseline/` and `candidate/`; both use the same generated fixture sizes and native storage scenarios.
