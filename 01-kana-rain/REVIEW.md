# 01 — Kana Rain: current design review

**Baseline:** version 1.4.0. **Sources:** [current specification](./SPECIFICATION.md), [game documentation](./README.md), [new-kana admission rules](./NOVELTY_BALANCE.md), and the implemented modules in `src/`.

The [earlier review](../docs/history/kana-rain/REVIEW.md) is preserved as history. Its recommendation to default to Steady practice and its independent-recall readiness proposal have been superseded by the product decisions below.

## Design direction

Arcade challenge is the main experience. Score, increasing rain pressure, hearts, streaks and the desire to improve a run drive replay. Learning evidence is recorded through play; the game retains reading and pronunciation feedback without making every mistake a mandatory lesson.

Rain difficulty controls hearts and the time-based curve. New kana pace controls recovery of first presentations after recent expirations. Keeping these choices independent lets players retain an enjoyable arcade challenge while slowing new material. No active-repertoire subset removes already unlocked kana from play.

The diagnostic new-kana counter was intentionally removed from the HUD. Admission rules remain active in the background; the player-facing choice is in the menu and Settings. Partial text is cleared on expiration, while ordinary pauses retain it.

## What to preserve

- Immediate typed-answer feedback, any-visible-drop matching and the highlighted priority for forced submissions.
- Arcade acceleration, wrong-answer consequences, hearts, existing score rules and celebrations.
- Optional Steady practice, focused mistake review and clear distinction between reading and script matching.
- Touch controls, pause semantics, reduced effects, offline audio and explicit analytics consent.
- Existing learning history, first-answer counters, independent evidence, unlocked rows and best scores.

## Validation criteria

- Each pace profile survives reload and changes admission without changing rain difficulty or deleting history.
- Two recent expirations close first presentations; a full qualifying recovery window reopens them. Corrected retries do not count as first-try hits.
- Spacing, starter-vowel exceptions, per-session limits and one-debut-on-screen rules apply across normal queues, retries and confusion partners.
- Familiar kana stay eligible while first presentations are paused; words and script matching retain their existing schedules.
- An ambiguous reading can auto-submit without requiring a second key, and longer readings remain typeable.
- Expiration clears partial text and pending automatic answers; pausing alone does neither.
- Desktop, portrait and landscape play remain usable, and saving/reloading preserves learner evidence and records.

The [README](./README.md#structure-and-checks) lists the automated unit and browser suites. Historical reports record technical verification, not measured learning gains or proof of long-term retention. Further balance changes should be guided by actual playtests.
