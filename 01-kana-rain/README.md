# Kana Rain

Game 01 from `../brainstorm-minijogos-japones.md`, implemented as a small HTML/CSS/JavaScript application. All game instructions, controls, and feedback are in English. Japanese is used for the learning content. The supplied standalone prototype is preserved; its kana catalogue and shared learner model form the basis of this implementation.

[Play Kana Rain](https://kana-rain.nihongogrove.top/) · [How to play](https://kana-rain.nihongogrove.top/about.html) · [Artwork](https://kana-rain.nihongogrove.top/art.html)

The game is public and requires no account. Learning progress and preferences are stored locally in the current browser, with no account or cloud synchronization. My Kana Garden lets players export their progress.

Everything specific to this game is contained in `01-kana-rain/`: application files, artwork and concepts, the audio bundle, scripts, tests, and documentation. The shared brainstorm document stays at the Japanese-games project root.

The English translation of the original game specification is in [SPECIFICATION.md](./SPECIFICATION.md). The design review and proposed improvements are in [REVIEW.md](./REVIEW.md). The numbered catalogue is in the [project index](../README.md).

## Play locally

Use **Node.js 20.9 or later** and **pnpm**. From the project root:

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

Starting or resuming a session shows a skippable three-second countdown. The clock, drop travel, acceleration, and answer reaction time remain frozen until play begins; partially typed answers survive pauses. A first-time script explanation introduces matching kana before advanced drops resume.

## Gameplay

- Start with the five hiragana vowels. Choose Easy, Normal, or Hard before entering the garden; session lengths are 1, 3, 5, or 10 minutes.
- Easy provides 5 hearts and gentler rain, Normal provides 3 hearts, and Hard provides 1 heart and faster rain. Your selected difficulty is saved and cannot change during a session.
- Every drop reaching the ground is removed and costs exactly one heart. Losing all hearts ends the session. Missed kana remain available for future learning review.
- Falling speed increases with active session time, regardless of how many answers are correct. Starting fall times are 14 seconds on Easy, 10 on Normal, and 7 on Hard. Speed ramps linearly and is capped at 3×, 3.5×, and 4× respectively. The spawn interval also shortens as rain accelerates. Pauses stop both the clock and acceleration.
- Read a kana and type its sound. Answers submit automatically; Enter forces submission. Standalone `n` needs Enter so it does not consume the beginning of `na`, `ni`, etc. Common alternate romanizations are accepted.
- New items show an initial reading hint; the hint disappears after the first correct response. Assisted responses do not count as unaided successes for learning new rows.
- Rows unlock after every available kana has at least two unaided successes and 85% accuracy. Katakana, mixed scripts, and script pairing open after the basic hiragana rows. Words open when at least four readable words are available; the game recommends words after the basic rows.
- Wrong answers stain and accelerate the affected drop. They preserve your hearts until the drop reaches the ground.
- Drops approaching the pond show an exclamation mark and stronger warning outline. The pond edge highlights imminent misses, and the final heart has a distinct visual state. A missed drop produces a heart-loss cue; all cues remain useful with sound muted.
- The answer dock explicitly says whether to type romaji, hiragana, or katakana. Any visible drop can be answered; the highlighted drop is the priority for forced submissions and listening.
- Strong kana move to producing the opposite script rather than romaji. Script pairing uses a full kana keyboard, avoiding multiple-choice guessing. Desktop Japanese IME and touch input are supported.
- Personal confusions are revisited together, side by side. The shared scheduler targets review, weak, and new items with a bounded new-item count.
- Pause with Escape or the Pause button. Leaving the tab pauses automatically. Finish preserves all answer evidence and displays session results.
- Progress is written after every answer to an immediate localStorage journal and IndexedDB. The newer stored snapshot is restored. Progress can be exported from My Kana Garden and reset in the instructions menu.
- My Kana Garden shows exact next-row readiness, with unaided successes and overall accuracy for every unlocked kana, including earlier rows. Settings explains locked modes. Corrections and unlock announcements stay visible instead of being replaced by routine success feedback.
- Results include every mistaken or missed item with its reading and a pronunciation button when a recording exists. **Review these kana** starts a focused 60-second round using the same difficulty and hearts. It leaves the normal duration selection unchanged and stores its personal best separately.
- Streaks of 5, 10, and 20 receive small celebrations. The title screen and HUD show the personal best for the selected mode, difficulty, and duration; beating an existing record receives its own announcement.
- The touch keyboard supports taps, clicks, and native Enter/Space activation. An ABC/kana switch supports mixed answer formats on phones; changing formats clears incompatible partial text, while ordinary pauses preserve it. Reduced effects can be enabled in Settings and is saved on this device; the system's reduced-motion preference is also respected.

## Audio and offline use

Pronunciations use only `kana-audio-bundle/manifest.json` and its MP3s. All 208 kana in the game have mappings, including combinations and separately recorded homophones. Hiragana and katakana use the bundle's shared pronunciation files. Audio plays on correct answers, corrections, misses, and lesson taps; it can be muted.

Word mode plays a whole-word recording only when the bundle provides that exact word. Other words receive a reading and English meaning without fabricated whole-word audio. The bundle's provenance, licenses, and review metadata are preserved in its folder.

All menu buttons and session selectors have short, gentle Web Audio interface tones. Start, confirmation, return, countdown, heart loss, streaks, records, and unlocks use distinct cues. These effects respect the saved sound toggle and lower their volume while a recorded pronunciation is playing. Browsers without Web Audio continue to work silently; kana pronunciations always use the supplied MP3s.

The service worker caches the application, optimized gameplay images, manifest, and all 112 MP3 recordings. The main menu confirms when this initial cache completes. Gameplay and sound then work offline. The separate art gallery includes full-resolution source images and is loaded on demand.

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

Run the content, scheduler, storage, and difficulty checks inside `01-kana-rain/`:

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
