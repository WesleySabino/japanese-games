# 01 — Kana Rain: current specification

**Catalogue ID:** 01. **Status:** implemented. **Baseline:** version 1.4.0.

The [README](./README.md) records the complete current behavior and development commands. The [original catalogue translation](../docs/history/kana-rain/SPECIFICATION.md) is retained as historical design evidence; its proposed adaptive speed and automatic answer-format changes are not current requirements.

## Core game

Kana fall into a rain garden. The player types a reading, clears a drop and builds a score and streak. Any visible matching drop can be answered; a forced invalid submission belongs to the highlighted priority drop. Hiragana, Katakana, Mixed scripts and Little words keep romaji input. Katakana → Hiragana is an explicitly selected, separate matching mode.

Arcade challenge is the default. Easy, Normal and Hard have five, three and one heart respectively. A drop expiring costs one heart; a wrong answer stains and accelerates that drop. Rain accelerates with active play time, regardless of accuracy. Steady practice is an optional eight-opportunity session with constant speed and explicit continuation after corrections. Menus pause gameplay clocks.

Complete readings submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play so longer answers remain possible; Enter submits immediately. Expiration clears partial input and cancels any pending automatic submission. Ordinary pauses retain partial input.

## Progression and new kana

Rows unlock when every available kana has two correct first answers and at least 85% accuracy on submitted first answers. Hints do not block those hits; corrected retries and expired drops do not satisfy the two-hit requirement. Independent recall remains a separate evidence label.

The saved New kana pace preference is independent of rain difficulty: Calm uses 55/60, Balanced 25/30 and Bold 10/12. Two expirations in the selected rolling window pause first presentations. Recovery requires a full window, the profile's number of first-try hits and no more than one expiration. This is a recovery requirement after a pause, not a target before every debut.

When familiar candidates exist, three completed familiar drops precede the first novelty and separate subsequent novelties. At most two non-starter new kana debut per session, with one debut on screen at a time. Each alphabet's starter vowels bypass the pressure, spacing and two-debut budget. A first presentation is persisted when its drop appears. All unlocked kana remain eligible; words and script matching keep their existing scheduling. See [NOVELTY_BALANCE.md](./NOVELTY_BALANCE.md) for precise admission rules and edge cases.

## Feedback, access and data

Reading hints, pronunciation, visible danger cues, corrections, streak celebrations, records and unlock announcements support the arcade loop. Touch and physical keyboard input remain available, with responsive menus and reduced-effects settings. Sound is optional.

The shared catalogue, learner, scheduler, audio lookup and game module remain separate. Learner attempts and exposures, earned rows, best scores and preferences are stored in this browser through the existing localStorage/IndexedDB persistence. Progress can be exported; there is no account or cloud synchronization. Existing history and records are retained.

The static release includes only the explicit production allowlist. The service worker supports offline play. Legacy prototypes, historical documentation, design mockups, private exports, tests and generated test artifacts are excluded from the game bundle.

See the [current review](./REVIEW.md), [implementation history](./LEARNING_IMPROVEMENTS.md) and [project index](../README.md).
