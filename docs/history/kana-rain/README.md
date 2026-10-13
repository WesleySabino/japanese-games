# Kana Rain historical sources

These files preserve earlier design decisions. The [current specification](../../../01-kana-rain/SPECIFICATION.md), [current review](../../../01-kana-rain/REVIEW.md) and [game README](../../../01-kana-rain/README.md) describe the shipped game.

- [SPECIFICATION.md](./SPECIFICATION.md): complete English translation of the original 14-field catalogue entry. Its adaptive-speed, answer-format and word-mode proposals are historical.
- [REVIEW.md](./REVIEW.md): earlier assessment and recommendations, including superseded practice-first and independent-readiness proposals.
- [Standalone prototype source](./prototypes/kana-rain-standalone.html.txt): the original supplied single-file prototype, retained as non-executable text.

The prototype contains an older learner writer using the same localStorage key as the current game and cannot safely read the current schema. Keeping it outside the game directory with a `.txt` extension prevents accidentally opening it as a second game on the current origin. Do not restore it as a runnable page alongside the app.

Historical source wording is retained; relative documentation links were adjusted for this archive. Frozen audit inputs may cite their original locations and line numbers. These materials are excluded from the Kana Rain production bundle.
