# Design Review — 19. Compound Chain

These recommendations assess the [translated specification](./SPECIFICATION.md), based on the [brainstorm](../brainstorm-minijogos-japones.md), without changing the original. Design review recommendations remain separate and unapplied.

## Assessment

The example communicates the rule well: choosing a word also chooses the next starting point. A limited hand offers a strategy to validate. Before implementation, define consumption, replenishment, validity, and ending. Without this, the game can stall for lack of content, without a meaningful player choice.

## Strengths and gaps

The compound network gives vocabulary retrieval a purpose. Requesting the reading avoids treating a visual combination as mastered reading. Closing a cycle may be pleasant without being mandatory.

It is unclear whether the chosen tile leaves the hand, whether a new one arrives, or whether kanji can be reused. These options produce different strategies and ending conditions. The specification also needs to distinguish "compound not permitted in this bank" from "nonexistent word." Inverse-frequency scoring rewards precisely the less useful words, in tension with the overall frequency priority; limiting rank reduces the problem but does not eliminate it. "Confirming the reading" can mean merely tapping a button with the answer already visible, without providing the suggested production evidence. Finally, a random hand may not allow even the first move.

## Priority improvements

1. Define a finite hand without replenishment in the first prototype. Each correct answer consumes a tile; errors do not. Generate the hand from a valid path and allow reviewed branches to preserve real choices.
2. Score chain length and completion of the reading, removing the rarity incentive. Restrict words to known content before introducing one new word per game.
3. Clearly identify "no continuation available in this hand." This ends the chain without presenting the blockage as a knowledge error. A possible solution can be shown in the summary.

## Recommended MVP

A starting word and eight tiles, with a verified path of at least four continuations. The rule uses the last kanji, not the last kana. The player taps the next tile or selects it by keyboard, sees the proposed compound, and types its complete reading in kana; a button/Enter confirms. A round ends with a valid word and confirmed reading. Errors leave the tile available and show the relationship or reading to correct. Help reveals a continuation, marked as assisted. The session ends when no moves remain, the hand is exhausted, or the player exits voluntarily. A cycle can be highlighted in the summary but does not extend the game. Feedback includes the reading and English gloss of each confirmed word; there is no timer.

## Defer

Cooperative bot, dynamic replenishment, themed mode, multipliers, and broad searching for unknown words.

## Validation criteria

- Every initial hand admits the planned minimum path, without depending on an unknown word.
- Consumption, errors, and ending follow the same rule on touch and keyboard.
- The game detects the absence of continuation and never leaves the player stuck awaiting an impossible answer.
- Observe readings and meanings of compounds outside the chain to assess learning beyond memorizing the example cycle.
