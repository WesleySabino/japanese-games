# Design Review — 13. Who Am I?

This English translation proposes adjustments; the [translated specification](./SPECIFICATION.md) preserves the [original brainstorm](../brainstorm-minijogos-japones.md). Design review recommendations remain separate and unapplied.

## Assessment

The core is clear and deserves a small prototype: read clues, form a hypothesis, and answer. Gradual revelation offers an interesting decision without requiring animation or complex controls. Its inclusion in the fun and simplicity selections is consistent as a design hypothesis. Readiness, however, depends more on the quality of the riddles than on the screen. The promise of generating many clues from attributes does not yet resolve naturalness, ambiguity, or linguistic difficulty.

## Strengths and gaps

The clues offer purposeful reading and an alternative to direct translation. Producing the word distinguishes understanding the definition from recognizing an offered option. Support can be consulted as needed.

The example itself exposes a problem: after "animal," "four legs," and "kept at home," `ねこ` is still a compatible hypothesis. Marking it wrong because the internal target is `いぬ` contradicts the rule of accepting consistent answers. The next clue is what distinguishes the candidates. The specification also needs to define what happens after the final clue, which spellings and synonyms count, and how to handle a typing error. The proposed lexical coverage alone does not guarantee that the clues' grammar is comprehensible; treat the percentage as a content filter, not a learning guarantee.

## Priority improvements

1. Curate a few riddles with candidates and accepted answers for each stage. A compatible but inconclusive hypothesis receives "still possible" and releases another clue without a penalty; a contradicted hypothesis shows the clue that rules it out. This avoids teaching an error without adding extensive mechanics.
2. Ensure the final clue distinguishes the target within the reviewed set. Points for using fewer clues come only after this rule is clear; help remains available.
3. Review each clue's vocabulary, grammatical structures, and attributes. Start with manual writing and use templates only where the combination has been validated.

## Recommended MVP

A session contains five riddles about familiar objects or animals, with three or four clues. The player types kana using the virtual keyboard or an IME, confirms with a button/Enter, and requests another clue using a button or shortcut. There is no timer. A round ends with a conclusive answer or "show answer"; inconclusive hypotheses continue the round. Feedback brings together clues, answer, reading, and English gloss, with a contrast only when the text supports a difference. Lookups and assisted answers are recorded separately from independent answers. The session ends after five rounds or a voluntary exit.

## Defer

Reverse mode with a bot, abstract categories, unrestricted clue generation, and aggressive risk bonuses. Initial variation can come from the order of reviewed riddles.

## Validation criteria

- No answer compatible with the revealed clues receives feedback claiming a contradiction.
- Every riddle has an identifiable solution at the final clue and documented accepted variants.
- Touch and keyboard allow answering, consulting help, and finishing without dragging.
- With reworded clues, observe whether the player understands the content or merely recognizes a memorized sequence.
