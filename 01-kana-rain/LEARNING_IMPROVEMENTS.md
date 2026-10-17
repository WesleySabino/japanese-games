# Kana Rain — learning evidence and arcade behavior

**Release baseline: 1.5.0, 14 October 2026.** [README](README.md) and [specification](SPECIFICATION.md) describe playable behavior; [release notes](CHANGELOG.md) preserve release changes.

## Evidence retained through simplification

- Kana questions declare the assessed reading skill and romaji answer format. Copying the displayed kana does not count as reading.
- Attempts retain the first answer, assistance, outcome/reason and distinct timing fields. Expirations remain different from submitted wrong answers. Duplicate events do not duplicate progress.
- References, pronunciation help and corrections mark related questions as assisted. The conservative independence rule requires 60 seconds and responses to two other distinct assessed items; a round born during the exposure remains assisted. This label does not establish long-term retention.
- First-response, input, display and waiting times remain separate. Typing latency is not described as pure reading speed or used as a familiarity speed bonus.
- Confusions remain script-specific and retain ambiguous candidates instead of inventing a unique confusion.
- Save status follows completed journal/IndexedDB writes. Failed persistence preserves an explicit warning and export action. The storage key, schema, existing attempts, exposures and earned rows remain intact.
- My Kana Garden retains four familiarity states, audio tiles and exact row readiness. Independent/assisted details now live in a collapsed section; results emphasize arcade outcomes.

## Progression behavior retained

Since the 12 October progression correction, every available kana needs two correct first answers and at least 85% submitted first-answer accuracy. Continuous successful play can unlock rows with normal hints and pronunciation active. Corrected retries and expirations do not supply qualifying hits. Earlier unlocked rows still participate in readiness.

Independence is evidence, not a row-unlock requirement. Existing counters already contribute, and a qualifying hit triggers the normal in-session announcement. The [new-kana admission brake](NOVELTY_BALANCE.md) controls first presentations after recent misreadings separately from earned row availability.

## Arcade simplification

Only Hiragana and Katakana remain playable, both with romaji. Every run begins with three hearts; regular runs last three minutes and focused mistake review lasts one minute. All levels share answer-driven acceleration (correct answers advance the curve, expirations step it back) and the existing wrong-answer stain/acceleration. Corrections give feedback without a mandatory acknowledgement stage.

Difficulty is now the single selector for recovery of new kana: Easy 55/60, Normal 25/30, Hard 10/12. The brake now closes on four first-answer misses on seen kana instead of two expirations; familiar spacing, starter exceptions and session debut limits remain. Mobile controls, streak/record/unlock celebrations, offline audio, analytics consent and expiration-clears-input behavior remain.

Legacy game-mode evidence and records stay in saved data for compatibility. Unsupported old selections normalize without resetting learning; new rules use separate best-score keys. Historical specifications, reviews and prototypes remain in [the historical archive](../docs/history/kana-rain/README.md).

## Verification

Node checks exercise reading, progression, storage, migration, novelty profiles, input timing, arcade difficulty, analytics and packaging. Browser checks exercise actual menu/keyboard interaction, countdowns, partial-input behavior, corrections, results, review, row unlocks, responsive layouts, reload and offline audio. See [development commands](README.md#structure-and-checks). Artifacts stay local and no production learner profile is used during testing.
