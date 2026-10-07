# Review — 11. Kana Stack

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations are proposals; puzzle appeal and learning effects need separate tests.

## Assessment

Combining word building with space management has potential for meaningful choice beyond repeating answers. However, this game is the least ready in this group for simple implementation. The medium-complexity rating makes sense: a viable queue, lexical validation, removal, and interaction between words require rules that are still unsettled. A turn-based version is worth testing before continuous falling.

## Concrete issues

The generator slices "moras", while each block is described as one kana. The unit needs definition, particularly for small forms, marks, and repetition. Horizontal reading direction, start and end selection, minimum length, and overlap handling are also missing.

A line may contain several valid words or a short word inside another. Automatically removing them may reward accidental formation, eliminate the intended word, or cause hard-to-explain cascades. The game must ask which sequence the player recognized.

Building the queue from targets does not guarantee that the current board allows those words to form. Noise and gravity can make a game unsolvable. Showing a gloss for one second does not ensure feedback is read. Doubling points for hidden targets may also seem arbitrary; this priority can guide the queue before becoming a reward rule.

## Priority improvements

1. Use basic blocks and turn-based falling: choose a column, confirm, and only then bring in the next block. This preserves space management with fewer motor demands.
2. Initially accept horizontal words selected and confirmed by the player. This avoids ambiguous correction and identifies which word was intentional.
3. Prepare short, reviewed queues with known solutions, without noise. Add generation only after testing how space and vocabulary interact.

## Recommended MVP

A 6×8 well and a queue of up to twenty blocks, with the next block visible. Tapping a column or using arrows selects the destination; Enter confirms the drop. To validate a word, tap the beginning and end of a sequence or select them with the keyboard and confirm. Only words from the known set and in the defined reading direction are accepted.

A correct answer shows the word and gloss until the player continues, removes the blocks, and compacts each column predictably. New sequences do not disappear without confirmation. An error states that the selection is outside the accepted set, without destroying tiles. Help highlights an available word and records a lookup. The session ends when the queue is exhausted, the well fills, or the player exits; the summary separates confirmed words and help.

## Defer

Vertical words, kanji, continuous falling, combos, hidden bonuses, noise, and adaptive procedural queues.

## Validation criteria

- Each initial queue has at least one documented solution on an empty board.
- When two words overlap, only the confirmed sequence is removed.
- Compaction is predictable and does not grant correct answers automatically.
- Touch and keyboard allow positioning and confirming a word without a deadline.
