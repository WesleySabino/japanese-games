# Kana Rain

Part of [Japanese Games](../README.md), an open-source collection of
Japanese-learning games. Code, documentation, and original artwork are
available under the [MIT License](../LICENSE); audio and music keep their
[separate notices](../THIRD_PARTY_NOTICES.md).
[Contributions are welcome](../CONTRIBUTING.md).

**Release: 1.13.0 — 29 October 2026.** See [release history](CHANGELOG.md).

The production build packages the current game code and styles atomically with its document. Installed shell files are served from one complete cache generation; an interrupted update keeps the prior generation. Frozen public compatibility assets let supported older cached documents finish loading without executing mismatched current code. Progress storage is unchanged. The alphabet selector now aligns with the main-menu buttons at every breakpoint.

Queued saves share a consolidation while every caller still journals immediately; private snapshots use independent tree copies instead of another JSON round trip. Reduced effects also removes moving filters/backdrop blurs and avoids creating hidden splash/ripple nodes. Storage keys, schema, history, progression, normal visuals and audio are retained. Run `pnpm test:smoother-saving` after `pnpm build` for native single-commit, large-history two-tab/close and reduced-effects regressions.

Kana Rain is a small HTML/CSS/JavaScript arcade game: read a falling kana, type its sound, and keep the rain clear. Katakana opens after hiragana and is answered the same way. Hiragana and Katakana are the only playable alphabets. Instructions and controls are in English; the reading content is Japanese.

## Journey — both alphabets

The third alphabet choice, **Journey (both)**, starts with Hiragana, switches to Katakana in the same session after Hiragana completion, then interleaves both scripts after the five Katakana vowels reach the existing readiness rule (two correct first answers and 85% first-answer accuracy). Existing Katakana access is honored. Mixed access is an earned, additive flag; later mistakes do not relock it. Both alphabets keep their original histories, row unlocks, readings, input controls, shared failure pause and script-appropriate longer brake. Separate Hiragana and Katakana modes remain available.

For a demonstration with a private local export:

```powershell
node scripts/preview-journey.cjs --progress 'C:/path/to/kana-rain-progress.json' --port 4198
```

Open `http://127.0.0.1:4198/`. This localhost-only server imports additively into a separate local origin using the validated importer, confirms IndexedDB, reloads, and selects Journey. Reopening retains local practice rather than repeating the import. It never changes production or the source JSON. Only the public asset allowlist and two local preview endpoints are served. The preview script, export and bootstrap are excluded from production. The preview intentionally disables service workers to avoid stale local assets; the production build is tested offline separately. Do not expose or tunnel this private preview server.

Run `pnpm test` and `pnpm build && pnpm test:journey` for the new progression and native browser scenarios.

## Existing game

The illustrated garden, correct-answer/mistake/expiration counters, streaks, accelerating rain, pronunciation audio, touch sound pad and saved progress remain the core experience. The title screen asks only for **Alphabet**. All sessions use one shared pace and cautious new-kana recovery. Settings contains device effects and analytics/privacy controls; session setup is no longer repeated there.

The title menu fits the available height without internal scrolling. The alphabet field is centered, and the entry and input hints occupy separate lines so they remain readable on short screens. Settings includes the same sound toggle as the main sound button: both mute pronunciation, menu music and interface effects and remember the existing preference.

[Production game](https://kana-rain.nihongogrove.top/) · [Local preview](http://127.0.0.1:4173/) · [Specification](SPECIFICATION.md) · [Development](DEVELOPMENT.md) · [Learning design](LEARNING_DESIGN.md) · [New-kana rules](NOVELTY_BALANCE.md)

## Play locally

Use Node.js 22 or later and pnpm 11; CI pins pnpm 11.25.0.

```sh
cd 01-kana-rain
pnpm install --frozen-lockfile
pnpm start
```

Open http://127.0.0.1:4173/. A different port can be supplied through `PORT`. No build or runtime framework is required. Use HTTP rather than opening `index.html` directly, because audio lookup, IndexedDB and offline caching require a web origin.

## One arcade loop

- Regular runs last **three minutes**. Every run starts with **three hearts**, including the one-minute mistake-review shortcut.
- The adaptive rain curve has a 10-second initial fall, capped at 3.5×. The curve follows the player, not the clock: each correct answer advances it by 1.6 seconds and each expiration steps it back 20 seconds, never below the opening pace. Pauses freeze the clock, falling drops and automatic-submit delay.
- Each expired drop costs one heart, clears unfinished input and cancels any pending automatic answer. Losing all hearts ends the run. Wrong submissions stain and accelerate the affected drop without immediately taking a heart.
- Both alphabets use romaji typing or the sound pad. Any visible matching drop can be answered; forced invalid submissions and listening use the highlighted priority drop. Common alternate readings are accepted; copying the displayed kana is not a reading answer.
- Katakana keeps Hiragana as its support instead of romaji: a new katakana shows its hiragana partner (シ over し), and corrections, review cards and garden tiles name it (ネ = ね). The answer is still the sound: シ → `shi`.
- Corrections, mistake-review cards and result readiness hints only show Katakana that has already been presented. Unshown kana remain in the readiness totals; a new row is announced by its name. An unfamiliar Katakana is also hidden when pasted into an answer; the original response and confusion evidence remain in saved history. Unlocked rows alone do not count as presentation.
- Complete typed answers submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play for another letter; stop typing to accept, or press Enter immediately. Continuing cancels the pending match. An exact answer entered before the waterline is protected during this short wait.
- Start or resume with a skippable three-second countdown. Escape or the Pause button pauses; leaving the tab pauses automatically. Opening a menu during play pauses and closing it resumes; opening one from Pause returns to Pause. Ordinary pauses retain partial input.
- A danger badge and pond cue warn of imminent expirations. Heart loss, streaks of 5/10/20 and row unlocks have visual cues and optional sounds. Reduced effects preserves gameplay while calming decorative motion.
- Phone play opens the **sound pad** automatically: tap one of 15 fixed sound families (Vowels, K, S/SH, T/CH/TS, N, H/F, M, Y, R, W, G, Z/J, D, B, P), then the sound, which replaces the families in the same box — し and シ are S/SH → shi, しゃ is S/SH → sha, ん is N → n. All 208 forms take two taps, and a katakana uses its hiragana partner's cell. Slots never move and never depend on the falling kana. A composition submits at once (no `n` wait); one that matches no drop is a mistake for the drop highlighted when it began. The exact cell settles homophones (じ/ぢ, ず/づ, お/を), while the same sound still answers a lone homophone, as typing does. ‹ Back cancels a family; a drop expiring clears an unfinished composition; pausing keeps it.
- Phone portrait uses a compact status row and keeps listen, garden and sound beside the input. The pad uses two family rows when its actual width allows 36 px touch targets, otherwise three. Phone drops have 60% of their earlier width and height; the larger falling path leaves the normalized rain timing, adaptive curve and learning rules unchanged.
- In portrait the pad sits under the rain; in short landscape it sits beside it. On a phone the answer field is never focused while the pad is open, so the native keyboard opens only through the keyboard button. Physical keyboards keep working everywhere, and desktop starts with typing (the pad stays available). Safe areas and rotation are preserved without page scrolling; rotation keeps normalized drop progress.

## New-kana recovery

All sessions use the same recovery policy: **55 first-try hits in the latest 60 completed drops** after the longer brake closes. There is no difficulty selector or difficulty label.

Any wrong submission or expiration pauses first presentations immediately, including a debut. New kana wait for **ten consecutive first-try hits on familiar drops**; corrections and debut hits do not advance that recovery. Another failure resets the ten-hit pause. Familiar rain continues, and restarting or reloading retains the pause.

Two expirations or four familiar first-answer misses in the latest 60 completed drops also close the longer brake. A miss is a wrong first answer on a kana already seen before that drop. Recovery needs the entire window, 55 first-try hits, at most one expiration and fewer than four misses. These window targets apply **after that brake closes**, not before every debut. Assisted first-try hits count. History retains up to 60 completed drops across runs and reloads.

Katakana's longer brake uses its own Katakana outcomes, so earlier Hiragana errors cannot strand a new alphabet on ア. The immediate ten-hit pause remains shared across alphabets. The original novelty state and history remain intact for Hiragana and compatibility; the additive `katakanaNovelty` state is initialized once from actual Katakana evidence and then saved across runs and reloads. Changing alphabets never clears either state.

Three consecutive first-try familiar hits precede and separate nonstarter debuts, with only one debut on screen. Hiragana introduces at most two distinct nonstarter kana per run. Katakana allows two new nonstarter kana still needing practice at a time: meeting the existing two-first-hit/85% readiness rule frees a slot for another introduction during the same run. Readiness never bypasses spacing or either brake. Starter vowels bypass spacing and this budget, but respect both brakes when familiar content exists. An empty alphabet can present one starter to bootstrap familiar practice. All earned rows remain eligible for familiar play. See [exact rules and saved-data behavior](NOVELTY_BALANCE.md).

## Progress and results

Rows open when every available kana has two correct first answers and at least 85% accuracy on submitted first answers. Hints and pronunciation do not block row unlocks; corrected retries and expired drops do not supply those two hits. New gardens start with Hiragana only. Katakana opens after all 27 hiragana groups are available and **all 104 hiragana** meet that same two-hit/85% rule, including the final group. Existing Katakana access and progress are preserved, and earned access does not close after later mistakes.

The catalogue contains 104 exact hiragana/katakana pairs: 46 basic forms, 20 dakuten, five handakuten and 33 yōon per alphabet. It does not assess extended loanword combinations, standalone small kana, small tsu or the long-vowel mark. Script pairs are exact, keeping じ/ぢ and ず/づ distinct: hints name the right partner, and the pad's cell picks the written row.

My Kana Garden retains its two script tabs, four estimated familiarity states, current-row audio tiles, exact row-readiness details and progress export. **Learning details** is collapsed by default and contains independent/assisted evidence. An exposed answer remains assisted until at least 60 seconds and two other distinct assessed items have passed; a round created during that exposure remains assisted. This evidence is separate from the arcade unlock rule and does not certify long-term retention.

During play, the HUD shows **correct answers and time**, with large central hearts and a secondary streak. Wrong answers and expirations appear only in the final results, alongside correct answers. A correct accepted answer counts once, including an answer after correction. Every submitted wrong answer counts once, even repeated errors on the same drop. An expiration counts separately, costs its existing heart and does not add another wrong answer. Partial input and blank submissions count nothing. A wrong answer followed by expiration therefore contributes one wrong answer and one expired drop; these are event counts, not mutually exclusive categories of kana.

Results keep first-try hits, corrected answers and best streak as secondary details. Below them, the next row and up to four unready kana show the consecutive first-try hits each still needs (2 hits and 85% first-answer accuracy). Mistake cards keep readings and pronunciation; **Review these kana** starts a focused 60-second round with three hearts. On small screens the details scroll independently while Review, Another little rain and Return to the main menu remain visible; desktop keeps its two-column layout. Point scoring, record comparisons and new point-record writes are retired. Historical best scores and accuracy data remain unchanged in saved game data and progress export; no point record is converted into a hit count.

Progress reads the legacy `jp-learner-v1` save and writes a protected primary, `jp-learner-v1:protected:v1`, in localStorage and the existing IndexedDB store. Compatible snapshots unite attempts and exposures by ID; timestamps and revision vectors never establish that a history is complete. Earned rows, access, records and presented kana are retained. Save status follows completed writes; if saving fails, a persistent warning and export action remain available. The v2 ledgers reconstruct aggregates; v1 history retains unknown assistance and dated legacy errors. New submitted answers in both alphabets record `responseFormat: 'romaji'` and `inputMethod` (`composer` or `typing`); earlier events keep their exact shape and are not reclassified. Katakana events from 1.10.0 to 1.10.1-local.2 keep `hiragana-choice` and `recognition-options` assistance: they remain recognition answers, not independent-recall evidence. No account or cloud synchronization is provided.

Old session selections normalize to supported choices without resetting attempts, exposures, earned rows, novelty pressure history or records. The shared learner keeps legacy evidence; retired game modes are not offered or executed by the current runtime.

## Audio, offline and privacy

Concurrent tabs keep their own pending journals and merge learning events and counters. Closing an old runtime can still overwrite its legacy save, but cannot overwrite the protected primary. Reloading the current version reconciles late legacy answers with protected progress. Refresh old tabs to see the reconciled state; protection cannot be installed inside an old runtime already in memory. Explicit reset and the legacy replacement API start a new generation, which older snapshots cannot undo. Schema-v2 exports remain compatible.

**Import my progress** in My Kana Garden accepts version-1 or version-2 JSON exports up to 32 MiB. The preview does not change progress; cancel returns without applying it. Export the current state with **Save a backup first**, then choose **Apply import** to combine histories. The importer retains current preferences, unions attempts and exposures by ID, keeps earned rows and access, and preserves concurrent practice. Reimporting the same file does not duplicate events. Malformed or conflicting files are rejected. Importing is unavailable until a running session ends, and files stay on the device.

IndexedDB also retains one bounded checkpoint (`jp-learner-v1:checkpoint:v1`), refreshed at most once per minute during ordinary saves. Invalid copies are ignored independently so valid primary, checkpoint and legacy data remain usable. The optional checkpoint has a separate transaction: quota failure cannot undo a completed primary commit. This is local redundancy, not a cloud backup or protection against clearing all site data or losing the device; keep exported backups for those cases.

Pronunciations use only the supplied `kana-audio-bundle/` recordings. All 208 kana map to 104 runtime MP3 files, with shared pronunciation files for the alphabets and separately recorded homophones. The source bundle retains its 112 recordings and full provenance; eight historical word examples are excluded from the game/offline build. Correct answers, corrections, expirations, lesson tiles and review cards retain audio. The complete manifest, licenses and provenance remain available; gameplay loads a compact lookup.

The title screen plays a quiet koto and shakuhachi piece in the miyako-bushi scale. It is synthesized live by `src/music.js` (no audio file), starts after the first gesture, follows the sound control, stops in hidden tabs and fades out when the rain begins. It sits about 31 dB under the pronunciations and steps under interface tones while they sound. Provenance, levels and the CC0-1.0 notice are in `music/`; `pnpm test:music` checks the lifecycle, the levels and the loop joins.

The service worker caches the application, optimized gameplay images, audio lookup and recordings. Wait for **Your garden is ready offline** before relying on offline play. The art gallery loads source artwork separately on demand. Release cache changes do not reset learner storage.

Google Analytics 4 (`G-F69S8JDW5M`) loads only after explicit opt-in on the approved production HTTPS hosts. Local previews show the settings without contacting Google. DNT and Global Privacy Control keep analytics off. Analytics and privacy is inside Settings; opening it pauses active rain. No answers, counts, historical scores, kana IDs or learner records are sent. The functional consent cookie stores the choice for 180 days across the approved sites. See [privacy](privacy.html) and the analytics tests for the full boundary.

Activity events still use the existing `practice_start` / `practice_complete` names. Regular activity is `hira` or `kata`, with `review` for a focused round; endings are timer elapsed, hearts lost or manual finish. Pause/resume does not duplicate events. Historical event enums can remain valid in the shared analytics client without offering those sessions in the game.

## Structure and checks

`src/data.js` is the kana catalogue; `src/learner.js` owns shared evidence, scheduling and persistence; `src/audio.js` resolves recordings; `src/sfx.js` supplies tones; `src/music.js` synthesizes the menu music; `src/difficulty.js` defines the single rain curve and three hearts; `src/novelty.js` owns admission and recovery profiles; `src/game.js` owns the arcade game. `window.KanaRain` retains the module boundary (`id`, `capabilities`, `generateRound`, `render`, `score`, `dispose`). Shared learner compatibility is preserved.

```sh
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:improvements
pnpm test:novelty-presentation
pnpm test:novelty-pace
pnpm test:sound-pad
pnpm test:katakana-bridge
pnpm test:music
pnpm test:effects
pnpm build
pnpm test:quick-wins
pnpm test:update
pnpm test:storage
pnpm test:mixed-version-storage
pnpm test:import
```

Browser suites use isolated profiles and temporary localhost servers. The sound-pad suite measures fall distance, dock size and touch targets at eight phone sizes, and checks quick taps, ignored bounces, cancelled slides, stable slots, correction and evidence labels. `test:katakana-bridge` checks the hiragana completion gate, retained legacy access, katakana typing on desktop and the pad on phones, hiragana-partner hints and corrections, continued introductions in the same run and the evidence labels. The suites also check all three recovery profiles, three hearts, common acceleration, countdowns, input, pause/resume, results, focused review, touch layouts, row progression, offline audio and saved data. Title-menu checks cover 11 viewport sizes, centered fields, no internal scrolling and separated hints. Generated reports/screenshots stay in ignored test artifacts.

`test:quick-wins` checks the built `dist/` after `pnpm build`: results actions on phones and desktop, keyboard and touch focus through both pad stages, synchronized sound controls, and reload of synthetic saved progress. Keyboard/assistive activation moves focus from a family to its first enabled sound; Back or an answer returns to that family. Pointer/touch activation does not force a new focus target or open the native keyboard.

`test:update` installs the pinned 1.10.1 production build, creates real browser saves from synthetic history and switches the same localhost origin to the validated candidate build. Desktop and phone scenarios verify exact historical evidence, rows, brakes, preferences and both storage backends after activation/reload, online play, offline play/audio/navigation and reconnect. An interrupted audio download must leave the old version playable offline; retry must finish the upgrade without losing intervening answers. Service workers are deliberately enabled only in the disposable test contexts. Historical payload provenance is in [the fixture README](tests/fixtures/releases/README.md); coverage and remaining limits are in [TESTING](TESTING.md).

`test:storage` exercises native localStorage exhaustion, a Chromium-enforced IndexedDB quota, fallback/export/recovery, actual browser close/reopen during a blocked write, alternating tabs and 24 overlapping answers from two renderer processes. It checks exact event preservation and counters after closing a stale/pending tab and while IndexedDB is full. Tab-owned write-ahead journals and serialized merge commits prevent stale snapshots replacing another tab's changes. Tests use owned temporary profiles and synthetic data; they never open a personal Chrome profile. Select a scenario with `pnpm test:storage simultaneous-tabs-close-pending` (full list in [TESTING](TESTING.md)). Reports/screenshots stay in `tests/artifacts/storage/`.

`test:mixed-version-storage` runs the pinned 1.10.2 learner and the current source together against real browser storage. It checks old-tab close, overwriting both legacy backends while all current tabs are closed, checkpoint recovery and reset boundaries. `snapshot-recovery.test.cjs` covers divergent histories, misleading vectors/timestamps, malformed metadata, legacy v1/v2, exposure assistance and idempotent counters. All data is synthetic; reports stay in `tests/artifacts/mixed-version-storage/`.

For exploring all kana without earning rows, open `/?all`. It temporarily exposes the catalogue without changing earned row counts; answer evidence still saves. Use a disposable browser profile for tests. [Development](DEVELOPMENT.md) documents the architecture, performance invariants, asset preparation and release checks.

## Artwork and release

Feedback images are prepared after the critical scene images in low-priority tasks. The same stained drop, splash and ripple remain in use; failed preparation never delays input or prevents play. `test:effects` checks preparation order, cancellation, failure handling and real feedback on desktop and phone.

For an opt-in storage diagnostic, run `pnpm benchmark:save`. It uses disposable local Chromium profiles and generated histories only, and reports timings separately from correctness. See [TESTING](TESTING.md) for sizes, results and limits; this diagnostic does not modify the learner protocol or a personal save.

Use `pnpm benchmark:save --baseline` to measure the pinned 1.11.1 learner, then the command without arguments for current code, with other browser/CPU-heavy work stopped. Reports are separate in `tests/artifacts/save-performance/baseline/` and `candidate/`. Full history and settings must survive both runs; timing percentiles are diagnostic, not a CI performance threshold or measured game FPS.

The garden, spirit poses and water sprites keep the established teal, ivory and gold presentation. The public `art.html` gallery, runtime WebP images, source masters and [art prompts](assets/PROMPTS.md) remain. The gallery's concepts and atlases are public assets and also document the current art direction. Superseded mockups, infographics and prototypes are recoverable from Git history.

`pnpm build` creates `dist/` from an explicit production allowlist. It excludes private exports, prototypes, development scripts, tests and design documents. A build does not perform publication; deployment uses the verified release package. HTTPS or localhost is required for the service worker. Index/about metadata, canonical URLs, sitemap and robots retain the production address.
