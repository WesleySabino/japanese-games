# 20 — Reading Bingo

**Catalogue ID:** 20.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 20.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 20. Reading Bingo

1. **Name:** Reading Bingo.
2. **Concept:** a 5×5 card of kanji/words; the "caller" announces readings in kana or sentences with blanks, and the player marks the corresponding word.
3. **How it works:** the card is generated from the review pool. The caller displays (text, no audio) a reading (「やま」), a simple Japanese definition, or a sentence with a blank (「＿で およぎます」). The player has 5 s to mark a square. Incorrect marks cost a "token." Homophones are used deliberately and resolved through context.
4. **Action per round:** read the announcement → retrieve the kanji form → scan the card.
5. **Skill:** reading→form (the reverse of usual recognition), homophones, context.
6. **Why it helps:** the reading→kanji direction receives little practice in flashcard apps and is essential for "seeing" orally known words when they appear in writing. Visual search on the card passively repeats the forms of many kanji (extra exposure) while the target is actively retrieved.
7. **Level:** advanced beginner.
8. **Example:** the card includes 川, 皮, 山, 木, 気, 雨, 駅... Caller: 「かわで およぎます。」 (*I swim in the ___.*) → 川 (*river*), not 皮 (*skin*). Caller: 「き」 + 「もりに たくさん あります」 → 木, not 気.
9. **Progression:** reading alone → definition → sentence with a blank; larger card; shorter time; compound words; "reverse bingo" (the card contains readings, and the caller shows kanji).
10. **Data reuse:** `words[]`, `sentences[]` with automatic cloze, `homophoneIndex`.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium-high.
14. **Risks:** sentences with blanks that have more than one valid answer on the card—the generator checks that only one card item is compatible (checking semantic tags and collocations).
