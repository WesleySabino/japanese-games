# 01 — Kana Rain Design Review

**Basis:** [translated specification](./SPECIFICATION.md), [brainstorm](../brainstorm-minijogos-japones.md), [game documentation](./README.md), and the current code in `src/`.
**Assessment:** a strong concept that is already implemented. The specification describes the main loop well, but needs to distinguish initial practice from arcade pressure and clarify how an answer identifies a drop. The proposals below have not been applied to gameplay.

## What to keep

Reading, answering, and removing a drop form an easy-to-understand loop with an immediate visual consequence. Short sessions, words following isolated kana, and revisiting confusions all reuse the same mechanic. The current game already offers pause, a touch keyboard, IME support, persistent corrections, mistake review, and recording after every answer. These features address important gaps in the original text and do not need to be rebuilt.

## Gaps and differences

- **Speed:** the catalogue proposes adjustment towards approximately 85% accuracy and makes increases conditional on accuracy. Currently, `src/difficulty.js` accelerates according to active play time, regardless of correct answers. This creates a predictable challenge but can also pressure players who are still learning.
- **Lives:** three misses end the game in the brainstorm; currently Easy, Normal, and Hard provide five, three, and one life respectively. The original specification is a historical reference; the README records the implemented behavior.
- **Drop identification:** the original example treats `chi` as an error for さ even while ち is visible. The code accepts an answer matching any visible drop; an invalid forced submission is assigned to the priority drop. This difference changes which confusions can be inferred.
- **Evidence:** giving the wrong reading, missing a drop through delay, and answering correctly after hearing or seeing the answer are different situations. The code already reduces the weight of assisted responses, but a miss also records an incorrect answer. Typing time and keyboard search do not measure reading alone.
- **Facets:** producing the other script trains hiragana–katakana correspondence. By itself, it does not demonstrate recall of the sound or understanding of a word.

## Priority improvements with low implementation cost

1. **Offer steady practice as the initial option.** Reuse Easy with constant speed and few drops, leaving the rising curve for arcade play. Check whether players can practice new items without losing the session before reading the feedback.
2. **Explain the existing selection rule.** Briefly state that any drop can be answered and that Enter acts on the priority drop. Do not record a confusion pair merely because another drop went unanswered.
3. **Separate the reasons behind the evidence.** Record `wrong answer`, `time expired`, and `help used`, while retaining the consequence of losing a life in arcade play. Do not count an immediately copied correction as an unaided success.

## Recommended simple scope

Preserve the existing game: start with one hiragana row, answer using touch or a keyboard, keep feedback readable until the next action, and show a summary of mistaken items. One answer resolves one drop; the session ends at the selected time, when lives run out, or when the player leaves voluntarily, preserving evidence. In steady practice, a miss allows practice to continue. Recommending words should depend on readable words being available, without blocking all kana practice.

Defer new effects, daily challenges, rankings, and additional modes. The main investment should be in answer clarity and pace calibration, using the screens and content that already exist.

## Validation criteria

- With さ and ち visible, `chi` resolves ち; the instructions explain this behavior, and no confusion with さ is recorded automatically.
- Wrong answers, timed-out drops, and assisted successes remain distinguishable in the records; only unaided successes count towards readiness.
- The proposed practice mode maintains a steady pace; arcade play keeps its documented curve and pauses every clock when menus open.
- A one-minute session ends with a summary and review accessible through touch and keyboard, without losing recorded responses.
