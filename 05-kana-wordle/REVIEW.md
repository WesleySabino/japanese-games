# Review — 05. Kana Wordle

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The improvements are proposals to validate; this review does not confirm the brainstorm's retention claims.

## Assessment

The deduction has a recognizable goal and a clear ending in six attempts. Restricting guesses to seen vocabulary prevents the game from becoming an unrestricted dictionary search. Final feedback with meaning and context helps place the word beyond the colors. However, "low complexity" depends on reducing the rules: extra row and column clues require more careful definition than a basic Wordle.

## Concrete issues

The specification alternates between moras, kana, and positions without explaining each square's unit. Cases involving small forms, marks, repetition, and length need examples of accepted input and results. Before coding, the game should choose a representation and keep it consistent.

Colors also need precedence: a correct form in another position may share a row or column with the target at the current position. Repeated kana must not receive clues as though unlimited occurrences existed. The keyboard's accumulated information must distinguish "already found" from a clue that applies only to a specific position.

Having seen 150 words does not guarantee several guesses of the same length or a solvable deduction puzzle. "Real word" and "known word" are different validations. Typing mistakes should not consume an attempt or become evidence of not knowing the target. Glosses with multiple senses may also make a discovery purely orthographic.

## Priority improvements

1. Start with three positions and words without special combinations. Publish examples of the unit used before expanding the repertoire.
2. Initially use only correct position, presence in another position, and absence, accompanied by icons or text. Row/column clues can come later as optional help.
3. Validate candidate-set size by length. If the repertoire is insufficient, offer another length or indicate unavailability, without inventing words outside the known set.

## Recommended MVP

One secret word per game; up to six valid guesses. A clickable or tappable virtual keyboard, desktop input field, and Enter to confirm. Backspace removes the last tile. An unknown guess or one of the wrong length returns a clear message and preserves the attempt.

After each guess, show a legend and allow lookup of the meanings of words already submitted. Help reveals the target's gloss, records the lookup, and keeps the game going. A win or sixth incorrect guess ends the round; the session may end after one game. The final screen shows the target, meaning, and a short reviewed sentence, as well as indicating assisted attempts.

## Defer

Accumulated row/column clues, hard mode, special katakana, kanji compounds, daily challenge, and sharing.

## Validation criteria

- The legend explains why each position received its clue.
- Guesses with repeated kana never produce contradictory counts.
- Every target has a sufficient set of known guesses of the same length.
- Invalid inputs and help are reported separately from the six valid guesses.
