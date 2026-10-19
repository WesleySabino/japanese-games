# Kana Rain releases

## 1.8.1 — 2026-10-19

- Restore the two-expiration novelty brake alongside the four familiar first-answer miss brake. Recovery requires a full difficulty window, the existing hit target, at most one expiration and fewer than four misses.
- Any wrong submission or expiration immediately holds new kana until ten consecutive familiar first-try hits. Corrections and debut hits do not advance recovery. The pause survives restart/reload and applies to starter vowels once familiar content exists.
- Spacing between nonstarter debuts now counts consecutive familiar first-try hits instead of all completions. Familiar rain, the adaptive curve and three hearts are preserved.
- Reevaluate saved novelty history under the corrected brake and add a persistent cooldown without resetting attempts, exposures, earned rows, accuracy, records or the learner schema. Old recent failures conservatively start the ten-hit pause.
- Advance the service-worker cache to release 1.8.1.

## 1.8.0 — 2026-10-18

- Results name the next row ("Next: K-row · 1 / 5 kana ready") and list up to four unready kana with the consecutive first-try hits each still needs, closest first. The count uses the existing unlock rule (2 first-try hits and 85% first-try accuracy); nothing about unlocking changes. Hidden in exploration and once every row is open.
- Help mentions the new results line. No storage, records or novelty state change.
- The service-worker cache identifies release 1.8.0; saved progress is retained.

## 1.7.0 — 2026-10-17

- New kana pause after four wrong first answers on already-seen kana in the difficulty's recent window (60/30/12), instead of after two expirations. Expirations still cost a heart but no longer close the brake; misses on a kana's debut drop don't count. Recovery targets are unchanged: 55/60, 25/30, 10/12.
- The rain follows the player. Each correct answer advances the shared curve by 1.6 s and each expiration steps it back 20 s, never below the opening pace. The 10-second opening fall and the 3.5× ceiling are unchanged on every difficulty.
- Saved novelty state stays version 1 and loads unchanged. Earlier corrected rounds count as misses; earlier expirations don't. Learner key, schema, history, earned rows and personal bests (`arcade-v2`) are unchanged.
- Help, About, difficulty hints and docs describe the new rules. NOVELTY_BALANCE.md records the simulator check behind the four-miss limit.
- The service-worker cache name changes to identify the release; learner storage is not reset.

## 1.6.0 — 2026-10-16

- Replace the three-row touch QWERTY with the sound pad: 15 fixed sound families, then that family's sounds in the same box. All 208 forms take two taps; yōon and final n have their own slots; homophones resolve to the chosen row.
- Compositions submit immediately, without the `n` wait. Unmatched compositions are mistakes for the drop highlighted when they began. Short pointer bounces after a stage change are ignored; sliding off a button cancels it.
- Shrink the touch dock from about 260–290 px to 160–192 px in portrait and move it beside the rain in short landscape. Measured fall distance: 320×568 2 → 118 px, 390×844 197 → 326 px, 568×320 5 → 135 px, 844×390 3 → 187 px.
- Never focus the answer field on a phone while the pad is open; the keyboard button opts into the device keyboard. Physical typing, Enter, the 300 ms `n` wait for typing, pause, audio, offline play, hearts, timer and rain curve are unchanged.
- Record `inputMethod` (`composer`/`typing`) on new attempts only. Earlier history, rows, records and novelty state are untouched.
- The service-worker cache name changes to identify the release; learner storage is not reset.

## 1.5.0 — 2026-10-14

- Keep Hiragana and Katakana with romaji input; remove the other playable modes and the alternate session style from runtime and menus.
- Replace separate rain and novelty selectors with Easy/Normal/Hard new-kana recovery: 55/60, 25/30 and 10/12. Preserve the two-expiration brake, spacing, starter exceptions and debut limits.
- Use three hearts and the former Normal accelerating rain curve on every level. Fix regular runs at three minutes; keep focused mistake review at one minute with three hearts.
- Prepare runs only on the title screen. Settings retains device effects and privacy; deeper learning evidence moves to a collapsed Garden section.
- Highlight points, best streak, first-try hits and expirations in results. Preserve history, earned rows, accuracy, legacy records and export; isolate personal bests for the new rules.
- Retain mobile input, pronunciation, celebrations, offline play and analytics consent.
- Fit the title menu without internal scrolling, center the alphabet/difficulty fields and separate the footer hints. Responsive checks cover all 11 desktop/mobile viewports, including wide screens with limited height.

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
