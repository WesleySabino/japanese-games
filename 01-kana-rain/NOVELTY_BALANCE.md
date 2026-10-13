# New kana pacing — version 1.4.0

Version 1.4.0 includes the approved novelty brake, gradual introductions and selectable New kana pace profiles. The entire unlocked catalogue remains eligible for review; there is no active-repertoire subset per session. These admission rules preserve the existing arcade rain, hearts, scoring and learning history.

## Rules

- Kana reading (Hiragana, Katakana and Mixed scripts), including Arcade, Steady practice and focused review, shares a history of the latest 60 **completed drops** across sessions and reloads. The selected **New kana pace** determines how much of that history controls admission: Calm uses 55 first-try hits in 60 drops (default), Balanced uses 25 in 30, and Bold uses 10 in 12.
- Two or more expirations in the selected window close admission of never-presented kana. Reopening requires that profile's full window, its first-try hit target, and no more than one expiration. An assisted first-try answer still counts. Correcting a wrong answer does not become a first-try success.
- A drop enters the window once, when answered correctly or expired; an incorrect answer is terminal in Steady practice, but intermediate in Arcade. Abandoning an unanswered drop is not fabricated as an error or timeout.
- Start with three completed familiar drops before a debut, and require another three familiar completions between debuts. An introduction keeps its debut identity until its drop leaves the screen.
- At most two different never-presented kana debut per session, and only one debut can be on screen. The budget is consumed by presentation, not selection or success. Retries and repeat appearances do not consume another debut.
- New queues, unlocks, retries and confusion partners all go through the same presentation gate. A queued debut can be deferred after the gate closes; familiar content fills the rain without slowing its time-based curve.
- Starter exception: each alphabet's five vowels bypass the window, warmup and two-debut budget, but still appear as one debut at a time. This gives a new garden enough content to start without deadlock. Subsequent rows use the normal limits.
- Words and explicit script matching retain their existing scheduling. Their different tasks do not contribute to kana-reading pressure.

The three presets are player choices based on the approved playtests, not established optimal learning values. Calm keeps the approved 55/60 balance as the default; Balanced and Bold offer the earlier 25/30 and 10/12 targets. Hearts, wrong-answer acceleration, streaks, scoring and row unlock thresholds are unchanged. A row unlock grants availability; it does not force immediate presentations.

## History and architecture

`src/novelty.js` owns a small additive `games['kana-rain'].novelty` state. The shared learner and its storage key/schema are unchanged. First initialization replays terminal kana-reading attempts by round, retaining pressure hysteresis, and recognizes previous in-game initial readings and legacy responses. Garden reference panels and lesson cards do not count as playable debuts. Historical records without a terminal result are not inferred as completed drops.

Every subsequent presentation and completed drop saves through the learner's existing journal/IndexedDB path. Existing attempts, exposures, independent/assisted classifications, row unlocks, accuracy, preferences and records are retained. New session budgets reset at session start; the pressure window does not.

An existing saved 30-drop window (or an older 12-drop window) is preserved and grows toward 60 as more drops complete; older discarded samples are not invented or replayed. The selected window is evaluated in the background without a counter in the game HUD. An already open gate remains open unless the selected window contains two expirations; a recovery target is not a requirement before every debut.

The selected profile is saved additively as `novelty.pace`. Older saves without it default to Calm without rebuilding their pressure history or changing `blocked`. Between sessions, switching profiles reevaluates the same real history: two expirations in the selected tail close the gate, and a previously held gate opens only with that profile's full recovery condition. All profiles retain up to 60 samples, so switching from Bold back to Calm does not discard older results. Session setup and Settings show the same preference; it is locked during active or paused play and is unavailable for Words and script matching. Rain difficulty, hearts and timing remain separate.

## Verification

Unit and game integration tests cover all three recovery boundaries, the unchanged two-timeout brake, profile switching, persistence and setup locks, recovery, restart and reload, growth of existing 30-drop and 12-drop windows, distinct completed drops, migration without rewriting evidence, familiar openings, starter vowels, queue refills, confusion partners, first presentation before an answer, and continued play after the budget is exhausted. Existing input, arcade difficulty, storage, offline and performance checks remain applicable.

The private local-preview helper in `.release/` can seed a supplied progress export once per browser before the game starts. Its snapshot and routes are not part of the production build; later local progress is not replaced on reload.

## Release interface

The New kana / Introduced diagnostic block has been removed entirely from the game HUD, together with its DOM, renderer, styles and bundled/offline asset. Score, Streak, Time, hearts and game controls remain. All pressure, recovery, first-presentation, spacing and per-session budget rules continue unchanged in `src/novelty.js` and the gameplay scheduler. The release includes the approved rules without exposing the diagnostic counter.

The New kana pace cards in Settings and the menu shortcut remain available. They show the three selectable recovery profiles and save the preference without changing learning evidence.

An expiration clears unfinished input and cancels pending automatic submission in both session styles. Ordinary pauses preserve unfinished input. The existing HUD adjusts score, streak and time text to fit larger values.

Run `pnpm run test:novelty-presentation` for isolated browser checks that the counter is absent while recovery, first presentation, spacing, limits, restart/reload and responsive HUD geometry still work. Screenshots and verification data are written to the ignored `tests/artifacts/novelty-presentation/` directory; no production profile is opened or changed.

Run `pnpm run test:novelty-pace` for isolated browser checks of the Settings cards, menu shortcut, each profile's admission parameters, preference persistence, history retention, session locks and responsive layouts. Screenshots and verification data are written to the ignored `tests/artifacts/new-kana-pace/` directory. Both focused suites run in Kana Rain CI alongside the existing core, browser and learning-improvement checks.
