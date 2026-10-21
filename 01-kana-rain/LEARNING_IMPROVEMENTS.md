# Kana Rain — learning evidence and arcade behavior

**Release: 1.10.1, 21 October 2026.** [README](README.md) and [specification](SPECIFICATION.md) describe playable behavior; [release notes](CHANGELOG.md) preserve release changes.

## Evidence retained through simplification

- Both alphabets ask for the sound, with romaji typing or sound-pad composition. Katakana shows its hiragana partner where Hiragana shows romaji: on a debut drop and in corrections. Copying a displayed kana prompt does not count as a reading answer.
- New Katakana attempts are recorded like Hiragana ones (`romaji`, with `typing` or `composer`) and follow the same assistance rules. The retired three-choice format allowed answers by elimination, so its `hiragana-choice` events keep `recognition-options` assistance and never count as independent recall. Earlier romaji and retired-mode events keep their exact meaning and shape.
- Attempts retain the first answer, assistance, outcome/reason and distinct timing fields. Expirations remain different from submitted wrong answers. Duplicate events do not duplicate progress.
- References, pronunciation help and corrections mark related questions as assisted. The conservative independence rule requires 60 seconds and responses to two other distinct assessed items; a round born during the exposure remains assisted. This label does not establish long-term retention.
- First-response, input, display and waiting times remain separate. Typing latency is not described as pure reading speed or used as a familiarity speed bonus.
- Confusions remain script-specific and retain ambiguous candidates instead of inventing a unique confusion.
- Save status follows completed journal/IndexedDB writes. Failed persistence preserves an explicit warning and export action. The storage key, schema, existing attempts, exposures and earned rows remain intact.
- My Kana Garden retains four familiarity states, audio tiles and exact row readiness. Independent/assisted details now live in a collapsed section; results emphasize arcade outcomes.

## Progression behavior retained

Since the 12 October progression correction, every available kana needs two correct first answers and at least 85% submitted first-answer accuracy. Continuous successful play can unlock rows with normal hints and pronunciation active. Corrected retries and expirations do not supply qualifying hits. Earlier unlocked rows still participate in readiness.

Independence is evidence, not a row-unlock requirement. Existing counters already contribute, and a qualifying hit triggers the normal in-session announcement. The [new-kana admission brake](NOVELTY_BALANCE.md) controls first presentations after recent misreadings separately from earned row availability.

Katakana's longer admission brake now reads its own saved outcomes. The previous shared brake could require almost sixty repetitions of ア to repay earlier Hiragana failures. The immediate pause after any failure stays shared, and actual Katakana misses and expirations still close the Katakana-only longer brake. Original histories remain unchanged; a new saved game-data field derives only identifiable Katakana evidence rather than inventing its authorship.

New gardens begin with Hiragana. Katakana unlocks once all 27 hiragana groups are open and all 104 hiragana meet the two-first-hit/85% rule, including the final group. The additive `katakanaUnlocked` flag retains earlier Katakana access and progress; earned access remains open after later errors. The catalogue has 104 exact script pairs, including dakuten, handakuten and yōon; extended loanword combinations and standalone small kana are not assessed.

## Arcade simplification

Only Hiragana and Katakana remain playable, both answered by typing or composing the sound. Every run begins with three hearts; regular runs last three minutes and focused mistake review lasts one minute. All levels share answer-driven acceleration (correct answers advance the curve, expirations step it back) and the existing wrong-answer stain/acceleration. Corrections give feedback without a mandatory acknowledgement stage.

Difficulty is the single selector for recovery of new kana: Easy 55/60, Normal 25/30, Hard 10/12. Two expirations or four familiar first-answer misses close the longer brake. Any wrong submission or expiration also pauses introductions until ten consecutive first-try familiar hits; familiar spacing and starter bootstrap remain. Hiragana keeps its two-debut run budget. Katakana frees one of its two new-nonstarter practice slots when that kana reaches two first-try hits and 85% accuracy, so successful practice can continue introducing kana in the same run. This does not change first-attempt evidence or independent recall. Mobile controls, streak/unlock celebrations, offline audio, analytics consent and expiration-clears-input behavior remain.

Legacy game-mode evidence and point records stay in saved data for compatibility. Unsupported old selections normalize without resetting learning; answer counts do not overwrite or convert historical scores. Historical specifications, reviews and prototypes remain in [the historical archive](../docs/history/kana-rain/README.md).

## Verification

Node checks exercise reading, progression, storage, migration, novelty profiles, input timing, arcade difficulty, analytics and packaging. Browser checks exercise actual menu/keyboard interaction, countdowns, partial-input behavior, corrections, results, review, row unlocks, responsive layouts, reload and offline audio. `pnpm test:katakana-bridge` adds the hiragana completion gate, retained legacy access, katakana typing/pad input with hiragana-partner hints, and its evidence labels. See [development commands](README.md#structure-and-checks). Artifacts stay local and no production learner profile is used during testing.
