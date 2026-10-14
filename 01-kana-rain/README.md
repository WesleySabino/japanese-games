# Kana Rain

**Release baseline: 1.5.0 — 14 October 2026.** See [release history](CHANGELOG.md).

Kana Rain is a small HTML/CSS/JavaScript arcade game: read a falling kana, type its sound, and keep the rain clear. Hiragana and Katakana are the only playable alphabets. Instructions and controls are in English; the reading content is Japanese.

The illustrated garden, score, streaks, accelerating rain, pronunciation audio, touch keyboard and saved progress remain the core experience. The title screen now asks for only **Alphabet** and **Difficulty**. Settings contains device effects and analytics/privacy controls; session setup is no longer repeated there.

The title menu fits the available height without internal scrolling. Alphabet/difficulty fields are centered, and the entry and input hints occupy separate lines so they remain readable on short screens.

[Production game](https://kana-rain.nihongogrove.top/) · [Local preview](http://127.0.0.1:4173/) · [Specification](SPECIFICATION.md) · [Design review](REVIEW.md) · [New-kana rules](NOVELTY_BALANCE.md)

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
- All difficulty levels share the former Normal rain curve: a 10-second initial fall, accelerating with active play time and capped at 3.5×. Pauses freeze the clock, falling drops and automatic-submit delay. Accuracy does not control rain speed.
- Each expired drop costs one heart, clears unfinished input and cancels any pending automatic answer. Losing all hearts ends the run. Wrong submissions stain and accelerate the affected drop without immediately taking a heart.
- Type romaji in either alphabet. Any visible matching drop can be answered; forced invalid submissions and listening use the highlighted priority drop. Common alternate readings are accepted; copying the displayed kana is not a reading answer.
- Complete answers submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play for another letter; stop typing to accept, or press Enter immediately. Continuing cancels the pending match. An exact answer entered before the waterline is protected during this short wait.
- Start or resume with a skippable three-second countdown. Escape or the Pause button pauses; leaving the tab pauses automatically. Opening a menu during play pauses and closing it resumes; opening one from Pause returns to Pause. Ordinary pauses retain partial input.
- A danger badge and pond cue warn of imminent expirations. Heart loss, streaks of 5/10/20, personal bests and row unlocks have visual cues and optional sounds. Reduced effects preserves gameplay while calming decorative motion.
- Phone play opens the integrated letter keyboard automatically. Portrait, short landscape, safe areas and native keyboard viewport changes remain supported without page scrolling. Rotation preserves normalized drop progress.

## Difficulty means new-kana recovery

There is one selector. It changes when new kana resume after a rough streak; it does not change hearts, rain speed, scoring or session length.

| Difficulty | Recovery requirement after first presentations pause |
|---|---|
| Easy — default | 55 first-try hits in the latest 60 completed drops |
| Normal | 25 first-try hits in the latest 30 completed drops |
| Hard | 10 first-try hits in the latest 12 completed drops |

Two expirations in the selected window pause first presentations. Recovery needs the entire window, the selected hit target and at most one expiration. These targets apply **after a pause**, not before every debut. Assisted first-try hits count; corrected retries do not. History continues across runs and reloads, retaining up to 60 completed drops.

Three familiar completions precede and separate nonstarter debuts. A run introduces at most two distinct nonstarter kana, with only one debut on screen. Each alphabet's five starter vowels bypass pressure, spacing and the two-debut budget, while retaining the one-debut-on-screen rule. All earned rows remain eligible for familiar play. See [exact rules and saved-data behavior](NOVELTY_BALANCE.md).

## Progress and results

Rows open when every available kana has two correct first answers and at least 85% accuracy on submitted first answers. Hints and pronunciation do not block row unlocks; corrected retries and expired drops do not supply those two hits. Katakana becomes selectable after the basic Hiragana rows have opened.

My Kana Garden retains its two script tabs, four estimated familiarity states, current-row audio tiles, exact row-readiness details and progress export. **Learning details** is collapsed by default and contains independent/assisted evidence. An exposed answer remains assisted until at least 60 seconds and two other distinct assessed items have passed; a round created during that exposure remains assisted. This evidence is separate from the arcade unlock rule and does not certify long-term retention.

Results emphasize **points, best streak, first-try hits and expired drops**. Mistake cards keep readings and pronunciation; **Review these kana** starts a focused 60-second round with three hearts. New best scores use a separate ruleset so a changed rain curve cannot silently replace older records. Historical best scores and accuracy data remain in the saved game data and progress export.

Progress uses the existing localStorage journal (`jp-learner-v1`) and IndexedDB. Save status follows completed writes; if saving fails, a persistent warning and export action remain available. The compatible newer snapshot is restored. The v2 attempt/exposure ledgers deduplicate events and reconstruct aggregates; v1 history retains unknown assistance and dated legacy errors. No account or cloud synchronization is provided.

Old session selections normalize to supported choices without resetting attempts, exposures, earned rows, novelty pressure history or records. The shared learner keeps legacy evidence; retired game modes are not offered or executed by the current runtime.

## Audio, offline and privacy

Pronunciations use only the supplied `kana-audio-bundle/` recordings. All 208 kana map to 104 runtime MP3 files, with shared pronunciation files for the alphabets and separately recorded homophones. The source bundle retains its 112 recordings and full provenance; eight historical word examples are excluded from the game/offline build. Correct answers, corrections, expirations, lesson tiles and review cards retain audio. The complete manifest, licenses and provenance remain available; gameplay loads a compact lookup.

The service worker caches the application, optimized gameplay images, audio lookup and recordings. Wait for **Your garden is ready offline** before relying on offline play. The art gallery loads source artwork separately on demand. Release cache changes do not reset learner storage.

Google Analytics 4 (`G-F69S8JDW5M`) loads only after explicit opt-in on the approved production HTTPS hosts. Local previews show the settings without contacting Google. DNT and Global Privacy Control keep analytics off. Analytics and privacy is inside Settings; opening it pauses active rain. No answers, scores, kana IDs or learner records are sent. The functional consent cookie stores the choice for 180 days across the approved sites. See [privacy](privacy.html) and the analytics tests for the full boundary.

Activity events still use the existing `practice_start` / `practice_complete` names. Regular activity is `hira` or `kata`, with `review` for a focused round; endings are timer elapsed, hearts lost or manual finish. Pause/resume does not duplicate events. Historical event enums can remain valid in the shared analytics client without offering those sessions in the game.

## Structure and checks

`src/data.js` is the kana catalogue; `src/learner.js` owns shared evidence, scheduling and persistence; `src/audio.js` resolves recordings; `src/sfx.js` supplies tones; `src/difficulty.js` defines the common rain curve and three hearts; `src/novelty.js` owns admission and recovery profiles; `src/game.js` owns the arcade game. `window.KanaRain` retains the module boundary (`id`, `capabilities`, `generateRound`, `render`, `score`, `dispose`). Shared learner compatibility is preserved.

```sh
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
pnpm test:improvements
pnpm test:novelty-presentation
pnpm test:novelty-pace
pnpm build
```

Browser suites use isolated profiles and temporary localhost servers. They check the simplified choices, migration/history preservation, all three recovery profiles, three hearts, common acceleration, countdowns, input, pause/resume, results, focused review, touch layouts, row progression, offline audio and saved data. Title-menu checks cover 11 viewport sizes, centered fields, no internal scrolling and separated hints. Generated reports/screenshots stay in ignored test artifacts.

For exploring all kana without earning rows, open `/?all`. It temporarily exposes the catalogue without changing earned row counts; answer evidence still saves. [Performance diagnostics](PERFORMANCE.md) documents earlier measurements and the preserved optimization strategy.

## Artwork and release

The garden, spirit poses and water sprites keep the established teal, ivory and gold presentation. The public `art.html` gallery, runtime WebP images, source masters and `assets/PROMPTS.md` remain. Earlier concepts and explanatory images are preserved in [the design archive](../docs/design/kana-rain/README.md). The original prototype is [non-executable historical source](../docs/history/kana-rain/prototypes/kana-rain-standalone.html.txt).

`pnpm build` creates `dist/` from an explicit production allowlist. It excludes private exports, prototypes, development scripts, tests and design documents. A build does not perform publication; deployment uses the verified release package. HTTPS or localhost is required for the service worker. Index/about metadata, canonical URLs, sitemap and robots retain the production address.
