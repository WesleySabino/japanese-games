# Review — 07. Mirror Match

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

These recommendations are proposals to validate, without assuming that spatial performance demonstrates reading ability.

## Assessment

The memory game offers familiar rules, a small dataset, and a clear ending when all pairs are found. It is a good candidate for a short supplementary exercise. The kana mode is ready; word and kanji versions require additional rules and content. The brainstorm itself correctly identifies the main limit: remembering a card's location may dominate the association between forms.

## Concrete issues

The concept introduces words in different scripts, but the mechanics later restrict that pairing to avoid artificial spellings. The first scope should be limited to characters, treating kanji/reading as a separate variant rather than generalizing pairing to any word.

Turning over two cards that do not match does not necessarily demonstrate confusion: the person may know the forms do not correspond and be searching for the desired position. Recording every incorrect pair as a linguistic failure would produce misleading data. Likewise, completing a board by repeating positions does not demonstrate unassisted retrieval.

The specification needs to define how long two cards remain visible, what happens during animations, and when help reveals the reading. Automatically hiding cards may impede keyboard access or slower readers. Reading feedback needs to appear after the attempt, so it does not act as a constant clue.

## Priority improvements

1. Use six pairs of studied kana, including one relevant contrast, instead of starting with a 36-card grid.
2. Keep pairs revealed until the player confirms they want to continue. This gives time to observe without requiring adaptive display durations.
3. Add two final correspondences in new, visible positions. Record these responses as linguistic evidence; the number of flips remains a game metric.

## Recommended MVP

A board with twelve hidden cards. Touch or Enter turns over a card; arrows move focus. After the second card, a correct answer leaves the pair face up, while an error shows both forms, allowing reading lookups before hiding them again. The "Continue" button works with both input methods and preserves focus.

Help displays the association for the consulted pair and records a lookup, without penalty. Finding all pairs completes the board. The session contains one board and two correspondence tasks without hidden cards; it can be interrupted after any pair. The summary distinguishes pairs found, flips, lookups, and final correct answers. No timer or reduced exposure time.

## Defer

Larger grids, quick mirror, kanji, meaning, words in multiple scripts, and records. Increase the card count only if the exercise stays short and the final contrast indicates usefulness beyond positions.

## Validation criteria

- The person completes a pair without depending on rapid tapping or animation.
- Nonmatching flips are not automatically classified as confusion.
- Focus remains usable after hiding and revealing cards.
- The final correspondence works with new positions and without readings revealed beforehand.
