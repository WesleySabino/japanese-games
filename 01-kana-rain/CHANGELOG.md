# Kana Rain releases

## 1.4.1 — 2026-10-13

Repository organization only. The runtime, interface, input rules and learning data model are identical to 1.4.0. The service-worker cache name changes to identify the new release.

- Archive the standalone prototype as `.html.txt` outside the game directory. It used the same learner storage key with an older schema and must not run beside the current game.
- Preserve original specifications and reviews in `docs/history/kana-rain/`; the original paths now describe the current game.
- Keep unused concept artwork, prompts and infographics in `docs/design/kana-rain/`, outside the production asset tree.
- Clarify audio extraction provenance. Runtime artwork, the public art gallery, all 112 recordings and license/provenance metadata remain available.
- Ignore generated output and QA artifacts. Local release helpers, progress exports, rollback packages and private audit evidence remain outside production and Git.

## 1.4.0 — 2026-10-13

- Choose New kana pace independently of rain difficulty: Calm (55 first-try hits in 60 completed drops), Balanced (25/30) or Bold (10/12). Calm is the default.
- Pause first presentations after two expirations in the profile window. Recover with a complete window meeting the chosen hit target and at most one expiration.
- Require three completed familiar drops before/between new nonstarter kana; introduce at most two distinct nonstarter kana per session, with at most one first presentation on screen. Starter vowels have documented exceptions.
- Persist seen-on-spawn and recent results across sessions, preserving the existing learner key, schema, earned rows, evidence and records.
- Clear unfinished input and pending auto-submission when a drop expires.
- Fit large score, streak and timer values inside the HUD. Keep the new-kana admission counter out of the interface.

See [pacing rules](NOVELTY_BALANCE.md) for exact conditions and [current specification](SPECIFICATION.md) for the arcade loop.
