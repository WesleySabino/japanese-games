# Novelty pacing — local prototype

This change implements the novelty brake and gradual introductions. It does not implement an active repertoire per session: the entire unlocked catalogue remains eligible for review. No production deployment is part of this change.

## Rules

- Kana reading (Hiragana, Katakana and Mixed scripts), including Arcade, Steady practice and focused review, shares a rolling window of 12 **completed drops** across sessions and reloads.
- Two or more expirations close admission of never-presented kana. Reopening requires a full window with at least 10 first-try correct answers and no more than one expiration. An assisted first-try answer still counts. Correcting a wrong answer does not become a first-try success.
- A drop enters the window once, when answered correctly or expired; an incorrect answer is terminal in Steady practice, but intermediate in Arcade. Abandoning an unanswered drop is not fabricated as an error or timeout.
- Start with three completed familiar drops before a debut, and require another three familiar completions between debuts. An introduction keeps its debut identity until its drop leaves the screen.
- At most two different never-presented kana debut per session, and only one debut can be on screen. The budget is consumed by presentation, not selection or success. Retries and repeat appearances do not consume another debut.
- New queues, unlocks, retries and confusion partners all go through the same presentation gate. A queued debut can be deferred after the gate closes; familiar content fills the rain without slowing its time-based curve.
- Starter exception: each alphabet's five vowels bypass the window, warmup and two-debut budget, but still appear as one debut at a time. This gives a new garden enough content to start without deadlock. Subsequent rows use the normal limits.
- Words and explicit script matching retain their existing scheduling. Their different tasks do not contribute to kana-reading pressure.

The parameters (12, 2, 10 and the three-drop spacing) are initial design hypotheses for playtesting, not established optimal values. Hearts, wrong-answer acceleration, streaks, scoring and row unlock thresholds are unchanged. A row unlock grants availability; it does not force immediate presentations.

## History and architecture

`src/novelty.js` owns a small additive `games['kana-rain'].novelty` state. The shared learner and its storage key/schema are unchanged. First initialization replays terminal kana-reading attempts by round, retaining pressure hysteresis, and recognizes previous in-game initial readings and legacy responses. Garden reference panels and lesson cards do not count as playable debuts. Historical records without a terminal result are not inferred as completed drops.

Every subsequent presentation and completed drop saves through the learner's existing journal/IndexedDB path. Existing attempts, exposures, independent/assisted classifications, row unlocks, accuracy, preferences and records are retained. New session budgets reset at session start; the pressure window does not.

## Verification

Unit and game integration tests cover the 10-hit/2-timeout case, recovery, restart and reload, distinct completed drops, migration without rewriting evidence, familiar openings, starter vowels, queue refills, confusion partners, first presentation before an answer, and continued play after the budget is exhausted. Existing input, arcade difficulty, storage, offline and performance checks remain applicable.

The private local-preview helper in `.release/` can seed a supplied progress export once per browser before the game starts. Its snapshot and routes are not part of the production build; later local progress is not replaced on reload.

## Local HUD experiment — `codex/kana-rain-hud-test`

The approved compact HUD sits alongside Score, Streak and Time. It is enabled only on `localhost`, `127.0.0.1` or `[::1]`; hosted pages retain their previous HUD. This branch is for local playtesting only, with no production deployment or merge to `main`.

- **NEW KANA · OPEN / ON HOLD** reflects the saved admission brake. The actual recent sample size, first-try hits and expirations are shown below it on wider screens. An open pressure gate does not promise that the next drop is new.
- **INTRODUCED n / 2** counts non-starter kana actually presented for the first time in this session, before an answer. Its caption distinguishes recovery, familiar-drop spacing, an active debut, starter-vowel exceptions and an exhausted budget.
- The two indicators remain in the same row as the three statistics at all supported sizes. Small screens retain the status and count; the complete explanation remains available as the group's accessible description and native hover title. Word and script-matching modes do not display these kana-reading diagnostics.
- `src/novelty-hud.js` derives a read-only snapshot. Rendering happens on session changes, completed answers and spawning, not on each animation frame. It never changes the learner, admission rules, rain speed, hearts, scoring or saved history.

Run `npm run test:novelty-hud` for isolated browser checks of recovery, first presentation, spacing, limits, restart/reload, responsive geometry and the non-local hostname guard. Screenshots and verification data are written to the ignored `tests/artifacts/novelty-hud/` directory; no production profile is opened or changed.
