# Design Review — 20. Reading Bingo

The proposals below are separate from the [translated specification](./SPECIFICATION.md), keeping the [brainstorm](../brainstorm-minijogos-japones.md) as a reference. Design review recommendations remain unapplied.

## Assessment

The familiar mechanic can be implemented with few elements. However, twenty-five items, a five-second deadline, and switching between reading, definition, and blank increase the initial difficulty. A smaller prototype should validate whether searching for the answer creates a pleasant experience without reducing the task to visual scanning.

## Strengths and gaps

The kana→form direction complements activities starting with kanji. Homophones with context can produce useful decisions, and a completed line provides a visible session goal.

Ending with bingo is not made explicit: does a row, column, or diagonal count? Is there a free square? What happens if an already marked word is announced? The number and replenishment of tokens are also missing. Isolated readings cannot uniquely identify a target when the card contains homophones. Tags and collocations help filter sentences, but do not guarantee that a blank has a single semantically valid answer. A fixed deadline for new content conflicts with accuracy before speed. Finally, selecting a square provides recognition evidence; exposure to other squares should not count as correct answers or mastery of those items.

## Priority improvements

1. Start with a 3×3 card and no deadline. Define victory as one row, column, or diagonal, with no free square. The queue contains enough announcements to make victory possible and avoids repeating already marked targets.
2. Use announcements reviewed for each card. When there are homophones, include context before confirmation; accept all relevant alternatives or remove the round instead of choosing a secret answer.
3. Replace tokens and punishment with correctable feedback. Records distinguish the first attempt from assisted answers; speed comes only for items whose accuracy is already stable.

## Recommended MVP

Nine known words in shuffled positions and a queue of text announcements in kana, with short context when necessary. Touch marks a square; arrow keys move focus and Enter confirms. A round ends when the player selects correctly, consults the answer, or passes; no clock. An incorrect mark does not remain on the card: feedback shows the chosen word and the context distinguishing the target. Help displays an English gloss on demand. After a correct mark, show form, reading, and meaning; only the target receives response evidence. The session ends at the first bingo, when the queue ends—with a summary of confirmed words—or on voluntary exit. The generator guarantees that the full queue would allow a line.

## Defer

5×5 card, five-second limit, reverse bingo, automatic cloze, and frequent mixing of formats in the same game. One response direction is enough to validate the core.

## Validation criteria

- Every announcement has an unambiguous target or documented accepted alternatives on the card used.
- The queue does not require remarking squares and allows completion of a bingo.
- Touch and keyboard reach any square with legible text on a small screen.
- Observe correct answers with new words and contexts, separating word knowledge from memorization of position.
