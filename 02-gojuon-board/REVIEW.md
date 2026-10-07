# Review — 02. Gojūon Board

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; their effects on the experience and learning need validation.

## Assessment

The proposal is well bounded for a first prototype: a static grid, tiles, and placement confirmation. Its strength is making kana organization visible and providing a short exercise that is understandable without a lengthy tutorial. Its position in the Top 10 for simplicity is consistent with this basic version. The shuffled, mirror, and ghost chart variants expand the scope and are unnecessary to validate the core.

## Concrete issues

The described grid does not explain how to represent nonexistent cells, characters outside the regular matrix, or variants. This needs to be resolved in the data and interface before building a complete chart. Unavailable cells must not look like gaps the player needs to fill.

The example mixes positional information with visual recognition. Completing the board by elimination demonstrates organization, but does not confirm that each form was retrieved. Also, immediately locking a correct tile makes every attempt a lookup; assisted attempts should be distinguished from independent correct answers. Consonant and vowel labels also need to respect romaji's role as an initial scaffold.

## Priority improvements

1. Start with one studied row and a few gaps, keeping distractors within the same known set. Expand the board only after checking that the person understands placement.
2. Give unavailable cells a distinct appearance and no interaction. Use explicit metadata, avoiding calculation of every position solely from the kana text.
3. Finish the exercise with two correspondences without the grid, in shuffled positions. This small change checks transfer without depending on another implemented game.

## Recommended MVP

A round presents one row, two or three gaps, and a tray of tiles. With touch, select a tile and then a cell; dragging is optional. With the keyboard, arrows move focus and Enter selects or places, while Escape cancels the selection. The selected tile stays clearly marked.

A correct answer fixes the tile in place. An error returns it to the tray and keeps the correct position visible until the player continues; it does not end the round. A help button reveals the row or column, recording the lookup separately. The round ends when all gaps are filled, and the session after three boards and the check without the grid. The summary separates independent placement, lookup, and incorrect attempts. Time is informational only, with no penalty.

## Defer

Full chart, swap puzzle, dakuten, combinations, ghost chart, timer, and conjugation explanations. First test the usefulness of a small row.

## Validation criteria

- A beginner can select and place the first tile after a short demonstration.
- No unavailable cell receives focus or accepts tiles.
- Touch and keyboard allow completion of the same exercise without dragging.
- Success by elimination is insufficient to mark mastery: the check without the grid records separate evidence.
