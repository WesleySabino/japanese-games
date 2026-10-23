# Persistence compatibility fixture

`learner-1.10.2.js` is the original learner from this repository at commit `6bdf542` (`01-kana-rain/src/learner.js`). It is retained only to test an old runtime closing or writing during an upgrade; it is not shipped in the game.

SHA-256 after normalizing CRLF to LF: `b908462e680bf53855f36a68ab6d66dc60b0fea4d9e3758d124094bb8846fa5d`.

The native suite creates its own synthetic learner history. This file contains source code only, with no player data. Historical complete-release fixtures are documented separately in `releases/README.md`.
