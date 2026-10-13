# Kana Rain

Game 01 from `../planejamento/brainstorm-minijogos-japones.md`, implemented as a small HTML/CSS/JavaScript application. All game instructions, controls, and feedback are in English. Japanese is used for the learning content. The supplied standalone prototype is preserved; its kana catalogue and shared learner model form the basis of this implementation.

[Play Kana Rain](https://kana-rain.nihongogrove.top/) · [How to play](https://kana-rain.nihongogrove.top/about.html) · [Artwork](https://kana-rain.nihongogrove.top/art.html)

The game is public and requires no account. Learning progress and preferences are stored locally in the current browser, with no account or cloud synchronization. My Kana Garden lets players export their progress.

**Arcade challenge** is the main experience and the default for new players: read falling kana, keep the rain clear, and build your score before time or hearts run out. **Steady practice** is an alternative in Settings. The game remembers the session style you choose.

Optional Google Analytics 4 measures basic app usage only after explicit opt-in.
You can play with analytics off. [Privacy and cookies](https://kana-rain.nihongogrove.top/privacy.html)
explains the shared choice across Nihongo Grove, Japanese Core, and Kana Rain.

Everything specific to this game is contained in `01-kana-rain/`: application files, artwork and concepts, the audio bundle, scripts, tests, and documentation. The shared brainstorm document is in the repository's `planejamento/` directory.

The English translation of the original game specification is in [SPECIFICATION.md](./SPECIFICATION.md). The design review and proposed improvements are in [REVIEW.md](./REVIEW.md). The numbered catalogue is in the [project index](../README.md).

The [learning and arcade update](./LEARNING_IMPROVEMENTS.md) records the implemented improvements and their verification.

The [local novelty-pacing prototype](./NOVELTY_BALANCE.md) documents the persistent pressure brake and gradual first presentations, including starter exceptions and preservation of existing progress.

The [performance audit](./PERFORMANCE.md) records the Lighthouse measurements, animation/storage fixes and production loading optimizations in version 1.3.1. Production combines the core scripts and embeds the styles needed for the first screen; development retains separate source files.

## Play locally

Use **Node.js 22 or later** and **pnpm 11** (CI pins pnpm 11.25.0). From the project root:

```sh
cd 01-kana-rain
pnpm install --frozen-lockfile
pnpm start
```

Open [local Kana Rain](http://127.0.0.1:4173). No build is needed for local play. Use an HTTP server instead of opening `index.html` directly: the audio manifest, IndexedDB, and offline service worker need a web origin. A different port can be supplied through `PORT`.

The server serves this game folder. The application itself needs no runtime framework or external package. `pnpm install --frozen-lockfile` installs the pinned development tools for tests and asset preparation.

## The game screen

The rain garden fills the entire browser viewport. The main menu offers Enter the Garden, My Kana Garden, and Settings. During play, a floating HUD shows your score, streak, and time, while an answer dock sits over the pond. Session setup, progress, instructions, pause, and results are game menus over the same scene.

Opening a menu pauses the session. Closing a menu opened during play resumes it; closing a menu opened from Pause returns to Pause. Phone play opens the integrated touch keyboard automatically. Portrait, short landscape, safe areas, and native keyboard viewport resizing are supported without page scrolling.

Starting or resuming a session shows a skippable three-second countdown. The clock, drop travel, acceleration, and answer reaction time remain frozen until play begins; partially typed answers survive pauses. A first-time explanation introduces the optional Katakana → Hiragana mode before that session starts.

## Gameplay

- Start with the five hiragana vowels in **Arcade challenge**, the default session style. Choose your difficulty and session length in Settings; a saved choice of **Steady practice** is kept when you return.
- In Arcade, Easy provides 5 hearts and gentler rain, Normal provides 3 hearts, and Hard provides 1 heart and faster rain. Session lengths are 1, 3, 5, or 10 minutes. Difficulty is saved and cannot change during a session.
- In Arcade, each drop reaching the ground is removed and costs exactly one heart. Losing all hearts ends the session. Expiration is recorded separately from an incorrect submitted answer.
- Arcade speed increases with active session time, regardless of how many answers are correct. Starting fall times are 14 seconds on Easy, 10 on Normal, and 7 on Hard. Speed ramps linearly and is capped at 3×, 3.5×, and 4× respectively. Practice uses a constant 18-second fall. Pauses stop motion and correction visibility time.
- Choose **Steady practice** in Settings for eight opportunities, one drop at a time, constant speed and no lost hearts. Errors and expired drops wait for **Continue practice**.
- Read a kana and type its sound. Complete answers submit automatically; if an answer is also a prefix (such as `n` before `ne` or the alternate `nn`), it submits after 300 ms of active play without further typing. Continuing the answer cancels that pending match; Enter submits immediately. Pauses freeze the wait, and an exact answer entered before the waterline never loses a heart because of this delay. Common alternate romanizations are accepted.
- New items show an initial reading hint; the hint disappears after the first correct response. Reading hints and pronunciation feedback remain available and do not block row unlocks.
- Rows unlock after every available kana has at least two correct first answers and 85% accuracy on submitted first answers. Corrected retries and expired drops do not count toward those two hits. Previously recorded first answers already contribute; earned rows, records and preferences remain intact without a new storage migration.
- Independent recall remains a separate learning measure: a revealed answer stays assisted until at least 60 seconds and two other distinct assessed items have passed; a round born during that exposure stays assisted. These evidence labels no longer gate arcade progression, so continuous play can unlock new kana even in a small starting pool.
- Words require their kana and explicit introductions for small っ/ッ, the long-vowel mark ー and long vowels written with kana. The finite accepted romaji lists are composed from kana units; copying a displayed kana or word is not accepted as a reading.
- Arcade errors stain and accelerate the affected drop without immediately taking a heart. Practice errors finish that opportunity after explicit acknowledgement. Both retain correction text across pauses.
- Drops approaching the pond show an exclamation mark and stronger warning outline. The pond edge highlights imminent misses, and the final heart has a distinct visual state. A missed drop produces a heart-loss cue; all cues remain useful with sound muted.
- Hiragana, Katakana, Mixed scripts and Little words keep romaji answers throughout the session, including familiar kana and focused review. A familiar item never changes the answer format or opens a kana keyboard during reading play.
- Choose **Katakana → Hiragana** before starting for a separate script-matching session. Every drop is katakana and every answer is hiragana, including the interval between drops. Its full kana keyboard and desktop Japanese IME support matching without multiple-choice guessing. Existing script-match history remains intact.
- The answer dock shows the session's fixed format. Any visible drop can be answered; the highlighted drop is the priority for forced submissions and listening.
- Personal confusions are revisited together when admission allows. The shared scheduler targets review, weak, and new items; kana-reading sessions additionally limit first presentations across all queues and partners, using recent drop outcomes.
- Pause with Escape or the Pause button. Leaving the tab pauses automatically. Finish preserves all answer evidence and displays session results.
- Progress uses a localStorage journal and IndexedDB. Saved status follows completed writes, with a persistent export action when both fail. The newer compatible snapshot is restored. The v2 attempt/exposure ledgers deduplicate events and reconstruct aggregates on reload; v1 history retains unknown assistance and dated legacy errors.
- My Kana Garden labels all four estimated familiarity states and shows first-answer readiness for every unlocked kana, including earlier rows. Results separate independent readings, script matches, helped answers and expired drops. Response, input and residence times are distinct exported fields; none is labelled pure reading speed.
- Results include mistaken or missed items with reading and available pronunciation. **Review these kana** uses the chosen style: a focused 60-second Arcade round or eight Steady practice opportunities. Personal bests stay separate; existing arcade best keys are preserved.
- Streaks of 5, 10, and 20 receive small celebrations. The title screen and HUD show the personal best for the selected mode, difficulty, and duration; beating an existing record receives its own announcement.
- The touch keyboard supports taps, clicks, and native Enter/Space activation. Its layout follows the chosen session: romaji letters for reading, hiragana keys for script matching. Reading sessions stay playable on the physical keyboard. Ordinary pauses preserve partial text. Reduced effects can be enabled in Settings and is saved on this device; the system's reduced-motion preference is also respected.

## Audio and offline use

Pronunciations use only `kana-audio-bundle/manifest.json` and its MP3s. All 208 kana in the game have mappings, including combinations and separately recorded homophones. Hiragana and katakana use the bundle's shared pronunciation files. Audio plays on correct answers, corrections, misses, and lesson taps; it can be muted.

Word mode plays a whole-word recording only when the bundle provides that exact word. Other words receive a reading and English meaning without fabricated whole-word audio. Gameplay reads a compact runtime lookup; the complete manifest, provenance, licenses, and review metadata are preserved in the bundle.

All menu buttons and session selectors have short, gentle Web Audio interface tones. Start, confirmation, return, countdown, heart loss, streaks, records, and unlocks use distinct cues. These effects respect the saved sound toggle and lower their volume while a recorded pronunciation is playing. Browsers without Web Audio continue to work silently; kana pronunciations always use the supplied MP3s.

The service worker caches the application, optimized gameplay images, manifest, and all 112 MP3 recordings. The main menu confirms when this initial cache completes. Gameplay and sound then work offline. The separate art gallery includes full-resolution source images and is loaded on demand.

## Optional analytics

The local `assets/nihongo-analytics.js` client loads Google Analytics 4
(`G-F69S8JDW5M`) only after you allow it, and only on the three production HTTPS
hosts. Enhanced Measurement is disabled. DNT and Global Privacy Control keep
analytics off. Local previews display the same settings interface without
contacting Google. The functional `ng_analytics_consent` cookie stores the
choice for 180 days across the root domain and both apps.

The game has **Analytics and privacy** inside Settings, clear of the answer dock. Other pages retain their analytics button. Turning
analytics off disables future measurement, clears pending analytics commands,
and deletes accessible Google Analytics cookies. This does not reload the
game or erase learner progress. Open sibling sites check the shared preference
before events, on focus/visibility changes, and with a one-second timer that
background browsers may throttle. Opening analytics settings pauses active rain.

The client sends one sanitized page view per page or virtual route. Query
strings and fragments are excluded, titles use fixed values, and only known
page paths are allowed. Hosting aliases such as `/privacy` normalize to the
same fixed page as `/privacy.html`; duplicate alias page views are suppressed.
Referrers include only the referring site's origin. Google signals and
advertising personalization/storage are disabled. No answers, scores,
accuracy, kana IDs, usernames, access keys, exports, or learner records are sent.

`practice_start` fires once when the first countdown finishes and gameplay
begins. Pause/resume countdowns do not add starts. `practice_complete` fires
once from the real end function, with an explicit `timer_elapsed`,
`hearts_lost`, `practice_set_complete`, or `manual_finish` reason. Focused sessions use
`practice_mode: review`; other modes are `hira`, `kata`, `mix`, `pair`, and
`words`. These events describe activity, not learning or mastery. Tab closure,
reset, disposal, and a countdown ended before play do not count as completion.

The client accepts only fixed event names, parameters, and enum values.
Unknown fields reject the whole event. Activity before opt-in is discarded;
it is never replayed. Opting in mid-session can produce a measured end without
a measured start, so reports are an incomplete sample of consenting visitors.
The service worker caches only local analytics interface assets and the privacy
page; it does not cache Google's library or collection endpoints.

`pnpm test` includes 13 tracking-boundary checks and five checks against the
actual game lifecycle. Run only those checks with `pnpm test:analytics`.

## Artwork

Open `art.html` for the English art gallery. Artwork was generated **before implementation** with the built-in imagegen tool:

- `assets/concepts/visual-development.png`: environment and droplet concept board.
- `assets/concepts/garden-mood.png`: second full-scene concept.
- `assets/garden-source.png` / `assets/garden.webp`: production environment.
- `assets/spirit-atlas.png` / `assets/spirit.webp`: four transparent companion poses.
- `assets/water-atlas.png`: normal drop, stained drop, success splash, and pond ripple.
- `assets/drop.webp`, `drop-stained.webp`, `splash.webp`, `ripple.webp`: extracted gameplay sprites.
- `assets/icon.png`: extracted application icon.

The complete prompts are in `assets/PROMPTS.md`. Kana glyphs remain real system-font text over the generated sprites.

The approved immersive screen concepts and their prompts are retained in `assets/concepts/immersive-v1/`.

## Structure and checks

`src/data.js` is the shared kana/word catalogue; `src/learner.js` owns evidence and scheduling; `src/audio.js` resolves the supplied recordings; `src/sfx.js` supplies interface and game effect tones; `src/difficulty.js` defines hearts and the time-based rain curve; `src/game.js` owns Kana Rain. `window.KanaRain` exposes the module boundary (`id`, `capabilities`, `generateRound`, `render`, `score`, `dispose`) for integration into a future minigame shell. Sound recall and script pairing use separate learner facets.

Run the content, scheduler, storage, difficulty, consent, and analytics checks inside `01-kana-rain/`:

```sh
pnpm test
```

Install Playwright's Chromium browser before the first browser test run, then run the browser checks:

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

`tests/browser.cjs` uses the installed Playwright package and starts its own temporary localhost server on port 4180. It checks full viewport coverage without page scrolling, desktop/portrait/landscape layouts, menu pause/resume behavior, automatic answers, corrections, session results, persistence, script pairs, words, touch input, row progression, all three difficulty levels, acceleration without answers, one heart per miss, loss at zero hearts, and offline audio. Resizing preserves each drop's normalized fall progress so changing screen orientation cannot cause an accidental miss. Generated screenshots are retained locally under `tests/` and excluded from Git.

The responsive browser checks cover 320×568, 360×640, 390×844, and 412×915 portrait screens, plus 568×320, 640×360, and 844×390 landscape screens. They exercise gameplay and each game menu, readable hearts, usable touch input, scrolling dialogs, and preserved drop progress on rotation. Quick-win checks cover frozen countdowns, partial-answer preservation, script introductions, protected corrections and unlock announcements, exact readiness, mistake review, separate review records, streak milestones, personal bests, native keyboard activation, menu sounds, and mute behavior.

For reviewing later-stage modes without earning row unlocks, open `/?all`. This enables all content for that page without changing earned row counts; practice evidence still saves.

## Release and discovery

Inside `01-kana-rain/`, create the static production bundle:

```sh
pnpm build
```

Deploy the contents of `dist/` to [kana-rain.nihongogrove.top](https://kana-rain.nihongogrove.top/). The release build includes the game and information pages, art gallery and its required images, scripts/styles, audio bundle and its existing license/provenance notices, web manifest, and service worker. It excludes development scripts, tests, specifications, and the preserved standalone prototype. HTTPS or localhost is required for offline service-worker support.

`index.html` and `about.html` provide English descriptions, canonical URLs, social preview metadata, and structured data. `robots.txt` and `sitemap.xml` describe the public pages for search engines. If the production address changes, update these files together.
