# Kana Rain releases

## Unreleased — 1.12.1-local.1

- Group flushes queued for the same Web Lock before its transaction starts, while capturing and synchronously journaling each caller's facts. New changes during a transaction still queue a follow-up. Rejected locks and newer failure warnings remain observable.
- Copy already-private snapshot trees directly instead of serializing and parsing complete histories again. Keep the original JSON boundary for public data, storage reads and imports, independent durable/public snapshots, full-content cache comparisons and transaction-end reconciliation. Storage format and keys are unchanged.
- Remove moving drop/spirit filters and control backdrop blurs in Reduced effects, retaining target and danger markers. Skip splash/ripple DOM creation in that mode and for OS reduced-motion preferences. Normal visuals and pronunciation remain available.
- Add native batching, large-history concurrent-close, visual and differential regressions against the pinned 1.12.0 learner. Local preview only; not deployed.

## 1.12.0 — 2026-10-27

- Add a third mode, Journey: finish Hiragana, introduce the five Katakana vowels, then interleave both scripts without starting a new session. Honor previously earned access and save additive mixed access after vowel readiness; later mistakes never relock it.
- Plan each script separately and alternate eligible drops so a full Hiragana catalogue cannot crowd out Katakana. Keep all admission brakes, reusable Katakana learning slots, adaptive rain, shared sound controls and per-script accuracy counters.
- Keep focused reviews from both alphabets, preserve historical facts and storage formats, and provide a localhost-only sample-progress demonstration excluded from production.
- Add progression, counting, reload, two-tab and offline regressions plus desktop/phone layout captures. Keep the sample-progress preview and private exports out of the production package.

## 1.11.2 — 2026-10-26

- Reduce consolidation work by reusing a private normalized IndexedDB snapshot only when its complete serialized content matches, and retaining the commit-owned durable snapshot instead of cloning it again. Public memory still receives an independent copy and final reconciliation is unchanged.
- Preserve schema-v2 exports, protected storage keys, synchronous per-tab journals, serialized commits, imports, reset boundaries, checkpoints and quota fallback. No history truncation, delayed durability or personal save migration.
- Pin the 1.11.1 learner for differential regressions and repeatable baseline/current native diagnostics. Add a native coexistence regression for the previous protected-key runtime closing with a lock-blocked save.

## 1.11.1 — 2026-10-26

- Prepare the existing stained-drop, splash and ripple images after critical scene resources, outside the input path. Decode failures remain optional; images, effects and gameplay rules stay the same.
- Select the service worker shell from the cached home page: production installs the bundled runtime, source previews install individual modules. Keep the styles required by secondary pages, offline navigation and all 104 pronunciation recordings.
- Add focused feedback preparation and cache installation regressions, plus an opt-in native-storage diagnostic using large synthetic histories. Learner persistence, schema and personal progress are unchanged.

## 1.11.0 — 2026-10-25

- Add calm menu music: koto and shakuhachi with a light taiko and suikinkutsu water drops, in the miyako-bushi scale (B C E F♯ G) of a koto in hirajoshi tuning. It plays only on the title screen, starts after the first tap, click or key, and fades out when the rain begins.
- Synthesize it live with Web Audio in `src/music.js` (about 20 KB of source): no audio file or third-party sound, nothing extra to download, and the offline shell caches it with the game code. The loop is scheduled on the audio clock, so it repeats without a seam. The composition and its sound are CC0-1.0, documented in `music/PROVENANCE.md` and `music/LICENSE-MUSIC.txt`.
- Follow the existing sound button and Settings toggle (now labelled for pronunciation, music and effects) and stop in hidden tabs. The music sits about 31 dB under the pronunciations, drops 10 dB while one plays and 16 dB under each interface tone, so tones stay above it.
- Add `tests/music.test.cjs` (exact loop timing, gestures, fades, ducking) and `pnpm test:music` (real-browser lifecycle on desktop and phone, measured levels and loop joins).

## 1.10.5 — 2026-10-24

- Import a progress JSON from My Kana Garden, inspect a preview, cancel or apply, and export the current state before applying. Files remain on the device; imports are unavailable during a running session.
- Combine imported learning evidence with the current history without duplicating attempts or exposures, removing earned rows, or replacing current preferences. Keep the protected save protocol and concurrent-tab journals; older imports cannot erase newer practice.
- Validate file size, structure, versions, unsafe keys and conflicting event IDs before applying. Report persistence failures without claiming the profile was saved.
- Add unit and browser regressions for preview, cancellation, malformed files, merging, repeated imports, reconstructed familiarity, reload, quota fallback and responsive controls.

## 1.10.4 — 2026-10-23

- Prevent compatible, smaller snapshots from discarding attempts or exposures merely because they carry a newer timestamp or synchronization vector. Unite immutable facts, preserve legacy baselines and earned access/rows, and keep reset/import generations separate.
- Write protected localStorage/IndexedDB primaries that older runtimes cannot replace on page close. Continue reading legacy snapshots and pending journals, including late answers from old tabs. Do not modify the old canonical key.
- Retain one optional IndexedDB checkpoint in a separate transaction. Recover valid copies independently of malformed primary JSON or synchronization metadata; preserve reference assistance when reconstructing evidence. No cloud synchronization or automatic restoration of a personal backup is included.
- Add synthetic snapshot and native mixed-version regressions, pin the historical learner used by those tests and include the suite in CI. Promote the validated local preview and advance the release offline cache. Keep the production origin and the player's existing save; do not import personal backups.

## 1.10.3 — 2026-10-22

- Merge learning events and counter changes from concurrent tabs. Journal each tab's pending changes synchronously before consolidation, including on page close, and recover them without duplicated answers or sessions. Preserve earned rows, Katakana access, historical records, preferences and both novelty brakes.
- Keep the existing learner key, schema-v2 export and IndexedDB store. Use unique writer IDs, idempotent revision metadata and reset/import generations; retain readable recovery journals when write quota is full. Keep fallback/export warnings accurate when only one storage backend succeeds.
- Add native quota, browser restart, pending-close and 24-answer multi-tab regressions; add historical-release online/offline update tests and persistence/coverage documentation to CI. Development fixtures and reports stay outside the public build.
- Use the normal cursor on decorative drops. Preserve typing, the sound pad, counts, audio and adaptive rain. Advance the offline cache for this release. Reload previously opened tabs to activate the new saving protocol in each tab.

## 1.10.2 — 2026-10-22

- Keep result actions visible on small portrait and short landscape screens; only result details scroll. Preserve the desktop layout and reset detail scrolling for each new run.
- Keep keyboard focus within the sound pad: family to first enabled sound, then back to the original family on Back or submission. Preserve touch behavior, stable slots, the bounce guard, pause/resume and evidence labels.
- Add a sound toggle inside Settings, synchronized with the main control and the existing saved preference. Muting either control stops pronunciation and pending interface tones. Preserve storage/export guidance and both controls' unavailable state.
- Add focused browser regression checks against the built game. All existing progress, novelty brakes, adaptive rain, counts and records remain compatible. Promote the approved 1.10.2-local.1 preview and advance the offline cache without changing learner storage.

## 1.10.1 — 2026-10-21

- Keep unfamiliar Katakana out of wrong-answer feedback, mistake-review cards and result readiness hints, including pasted kana and previously recorded confusion partners. Announce Katakana rows by name instead of revealing every future glyph. Only an actual prior presentation permits its glyph in these surfaces; opening a row does not. Preserve readiness totals, the original response, confusion evidence and all earlier progress.
- Answer Katakana by sound through romaji typing or the fixed touch sound pad, with Hiragana reading support. Retain all older assisted-recognition evidence without conversion.
- Release the Katakana-only longer reading brake, reusable learning slots and aligned results from the local previews below. Preserve the shared ten-hit failure pause, adaptive rain, earned rows, access and historical records.
- Advance the offline cache to release 1.10.1 without changing learner storage.

## 1.10.1-local.3 — local preview, 2026-10-21

- Answer Katakana by sound, exactly like Hiragana: type romaji on a computer, or use the same fixed sound pad on a phone (シ is S/SH → shi). The answer controls no longer change with each drop, and any visible matching drop can be answered.
- Keep Hiragana as Katakana's support: a new katakana shows its hiragana partner instead of romaji (シ over し), and corrections name it (ネ = ね).
- Remove the per-drop Hiragana choices, drop selection and keys 1–3. Distractors came from the whole catalogue, so the first rows could be answered without reading katakana: with only the vowels open, a simulated player who picked an option from an open row was right 91% of the time.
- Record new Katakana answers as `romaji` with `typing` or `composer` input, like Hiragana. Earlier `hiragana-choice` events keep their exact shape and assisted meaning; rows, access, readiness, novelty brakes and learning slots are unchanged.

## 1.10.1-local.2 — local preview, 2026-10-20

- Fix cold Katakana getting stuck on ア while repaying Hiragana's longer admission brake. Save a Katakana-only pressure window initialized from real Katakana evidence, while preserving the original history and shared ten-hit failure pause.
- Keep Katakana's own four-miss/two-expiration brake, difficulty thresholds, progress, recognition evidence, three choices and result alignment intact. Reloads and mode switches do not reset recovery.

## 1.10.1-local.1 — local preview, 2026-10-20

- Return Katakana matching to three Hiragana buttons with keys 1–3, on one row on desktop and phones.
- Align desktop result panels and action columns, keep readiness on its own line and preserve visible actions on short screens.
- Replace Katakana's fixed two-introduction limit per run with two slots for newly introduced nonstarter kana still needing practice. Meeting the existing two-first-hit/85% rule frees a slot; familiar spacing, failures, expiration recovery and one debut on screen remain enforced. Hiragana retains its existing run limit.
- Preserve all saved learning evidence, row readiness, earned access, records, adaptive rain and new-kana pressure.

## 1.10.0 — 2026-10-20

- New gardens complete all 104 hiragana before unlocking Katakana: each needs two correct first answers and at least 85% first-answer accuracy. Preserve earlier Katakana access and all earned rows; the additive access flag never relocks an earned alphabet.
- Answer Katakana with six Hiragana choices, using clicks/taps or keys 1–6. Keep each round's options stable, allow selecting another drop, exclude homophone distractors and prevent delayed clicks or held keys from answering a replacement round. Hiragana typing and the sound pad remain available.
- Record the new activity as assisted recognition with `hiragana-choice` evidence, without rewriting earlier attempts or counting it as independent recall. Preserve learner storage, history, historical bests, accuracy, novelty brakes and adaptive rain.
- Fit desktop results actions without scrolling the main panel. Place next-row guidance and review side by side, keep replay/review/menu visible, and scroll only long review lists. Use one row of six choices on desktop and two rows of three on phones.
- Add exhaustive mapping, progression, keyboard and browser regressions, update help and advance the service-worker cache to release 1.10.0.

## 1.9.0 — 2026-10-19

- Replace visible points and record comparisons with correct-answer, wrong-answer and expiration totals in results. During play, show only correct answers and time around larger central hearts; wrong-answer and expiration totals stay in the final summary. Streak feedback remains.
- Count every accepted correct answer (including corrections) and each submitted wrong answer; keep expirations separate without inventing another error. Results retain first-try hits, corrections and best streak as secondary details.
- Retire numeric point scoring and new point-record writes. Preserve every historical best key/value, learner ledger, accuracy, earned row and novelty cooldown without conversion or reset.
- Keep adaptive rain, hearts, unlock criteria, sound pad, review mode and next-row guidance. Advance the service-worker cache to release 1.9.0 without changing learner storage.
- Compact the phone HUD into one status row with a secondary session label. Move listen, garden and sound controls to the answer line; use two sound-family rows when all targets fit at 36 px or larger. Reduce phone drop dimensions by 40% and expand their usable falling path without changing timing or progression.

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
