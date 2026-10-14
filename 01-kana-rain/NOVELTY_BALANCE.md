# New kana admission — simplified arcade

**Release baseline: 1.5.0, 14 October 2026.** The title screen now exposes one Difficulty selector, while the existing admission engine retains its three saved pace profiles for compatibility.

## Player-facing rules

| Difficulty | Stored profile | First-try recovery target | Completed-drop window |
|---|---|---|---|
| Easy — default | `calm` | 55 | 60 |
| Normal | `balanced` | 25 | 30 |
| Hard | `bold` | 10 | 12 |

Hiragana and Katakana, including focused mistake review, share up to 60 completed-drop outcomes across sessions and reloads. The selected difficulty controls the evaluated tail. Two or more expirations in that tail close first presentations. Recovery requires the profile's full window, its first-try hit target and at most one expiration.

**Recovery is required after the brake closes, not before every debut.** An assisted first-try answer counts; correcting a wrong answer does not. A drop enters the window once when correctly answered or expired. Intermediate wrong submissions do not create another completed drop. Abandoning an unanswered drop does not fabricate a failure.

Three completed familiar drops precede the first nonstarter debut and separate subsequent debuts. At most two distinct nonstarter kana debut per run, with only one debut on screen. The budget is spent by presentation, not selection or success. A debut retains its identity until that drop leaves the screen. Repeat appearances do not consume another distinct debut.

Normal queues, unlocks, retries and confusion partners share the same presentation gate. When a queued debut is deferred, familiar content fills the rain without slowing the common time-based curve. Each alphabet's five starter vowels bypass pressure, spacing and the two-debut budget, but retain the one-debut-on-screen limit. This prevents a new garden from stalling.

All earned rows remain eligible. A row unlock grants availability and does not force immediate presentation. There is no active-repertoire partition or admission counter in the HUD.

## Fixed arcade rules

Difficulty does not alter hearts, fall speed, score or run length. Every run has three hearts and the former Normal curve: 10-second initial falls, time-based acceleration capped at 3.5×. Regular runs are three minutes; focused review is one minute. Expiration clears unfinished input and pending auto-submit; ordinary pauses preserve input.

The presets are player choices from approved playtests, not proven optimal learning values. Easy retains the preferred 55/60 balance as default. Normal and Hard bring novelty back after shorter recovery windows.

## Persistence and compatibility

`src/novelty.js` owns additive `games['kana-rain'].novelty` state. The shared learner storage key and schema are unchanged. First initialization replays terminal reading attempts by round and recognizes previous in-game initial hints and legacy answers. Garden references do not count as playable debuts. Historical records without terminal outcomes are not invented as completed drops.

Presentations and completions use the learner's journal/IndexedDB path. Attempts, exposures, independent/assisted classifications, row unlocks, accuracy and records are retained. Session budgets reset at the start; the pressure window does not.

Older 30- or 12-drop histories remain and grow toward 60; discarded samples are not fabricated or replayed. Changing difficulty between runs evaluates the same real history. Two expirations in the selected tail can close the gate; an already closed gate opens only after that profile's full recovery condition. Active or paused sessions lock setup.

The prior `novelty.pace` preference maps to the new difficulty label, while the underlying profile identifiers remain compatible. Unsupported historical session choices are normalized separately. No history is erased by this UI simplification. New-rule personal bests are isolated from legacy scores, which remain exportable.

## Verification

Unit and browser checks cover the three exact recovery boundaries, unchanged two-expiration brake, profile migration/switching, persistent history, setup locks, first presentation before an answer, distinct completed rounds, restart/reload, starter exceptions, spacing/budgets, queue refills and familiar play after budget exhaustion. Responsive checks cover absent diagnostic UI and unchanged game controls.

`pnpm test`, `pnpm test:novelty-presentation` and `pnpm test:novelty-pace` run isolated checks. Generated reports and screenshots remain in ignored test artifacts. The private `.release/` preview helper may seed a supplied export once; it is excluded from production and must not repeatedly replace later local play.
