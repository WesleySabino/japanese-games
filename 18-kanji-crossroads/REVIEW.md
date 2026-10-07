# Design Review — 18. Kanji Crossroads

The assessment below proposes refinements to the [translated specification](./SPECIFICATION.md), preserving the [brainstorm](../brainstorm-minijogos-japones.md) as the original source. Design review recommendations remain separate and unapplied.

## Assessment

The cross offers a compact rule: one kanji must satisfy four words. The examples support later prototyping. The main work is ensuring correct puzzles suited to the player's vocabulary. "Huge combinatorial variety" remains an expectation to verify in the available bank, without resorting to rare compounds to fill the four sides.

## Strengths and gaps

Multiple constraints create a search different from flashcards and revisit related words. Showing all four readings and meanings after the solution can also give assisted answers value.

The proposed response using the central kanji's reading is ambiguous: one reading can correspond to several characters and does not necessarily identify the tile forming the words. Arrows need to indicate order without relying on the screen's usual orientation. The generator can find four existing compounds and still produce a round that is impossible for the learner. Allowing three known words and a new one requires the three known words already to support the solution and the new one to be taught, rather than used as a hidden requirement. Checking only one intended solution also misses valid alternatives. A limited dictionary cannot declare an answer outside it nonexistent in the language.

## Priority improvements

1. Answer by selecting a kanji tile, rather than an isolated reading. This resolves the center's identity without requiring kanji typing or complex conversion.
2. Start with manual puzzles containing four known words and reviewed accepted solutions. Automatic generation comes only when it can reproduce these guarantees.
3. Allow tapping an arrow to see the compound's linear order and requesting a word's reading as a hint. The hint should support reading, not teach a hidden spatial convention.

## Recommended MVP

An initial set of twelve reviewed crosses; each session presents three. The cross shows arrows and four to six candidate kanji tiles. Touch selects a tile and a button confirms; Tab/arrow keys and Enter perform the same task. A round ends with a valid solution or "show solution," without a timer. On an incorrect attempt, show which compounds do not meet the reviewed set, avoiding claims of absolute nonexistence. Help reveals the reading or gloss of one arm. On a correct answer, the four compounds appear linearly with readings and English glosses; a short reading confirmation for one word may provide additional evidence. The summary separates independent solving, assisted solving, and reading. The session ends after three puzzles or a voluntary exit.

## Defer

Double crossroads, a shared daily mode, time pressure, and unrestricted procedural generation.

## Validation criteria

- Every accepted tile forms the four compounds in the displayed direction.
- Valid alternatives in the reviewed set are accepted, and every puzzle has an accessible solution.
- The player can explain reading order without an extensive lesson on the cross.
- Check understanding of the four words after the solution, distinguishing solving by elimination from actually knowing them.
