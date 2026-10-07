# 13 — Who Am I?

**Catalogue ID:** 13.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 13.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 13. Who Am I?

1. **Name:** Who Am I? (なんでしょう？)
2. **Concept:** riddles in simple Japanese reveal clues one at a time; the fewer clues the player needs to guess the word, the more points they earn.
3. **How it works:** each "riddle card" has 3–6 clues ordered from the vaguest to the most specific, written only with vocabulary the player has already mastered (the generator checks this). The player can answer at any time by *producing* the word (typing in kana, assembling tiles, or—at early levels—choosing from 6 candidates). A wrong answer costs an extra clue. Clues are templates based on the item's attributes in the content bank (`category`, `color`, `size`, `place`, `sound`, `use`).
4. **Action per round:** read a clue in Japanese → update hypotheses → decide whether to take a chance.
5. **Skill:** understanding simple sentences without translation; vocabulary through Japanese definitions; inference.
6. **Why it helps:** this is the first systematic encounter with **monolingual definitions**—the player learns to understand Japanese through Japanese. Deciding "should I try now?" encourages close reading (every clue matters) and metacognition (confidence vs. knowledge). Each riddle provides ~10–30 words of comprehensible input.
7. **Level:** beginner (3–5-word clues) → pre-intermediate (clues with relative clauses).
8. **Example:** Clue 1: 「どうぶつです。」 (*It's an animal.*) · Clue 2: 「あしは 四本です。」 (*It has four legs.*) · Clue 3: 「いえで かいます。」 (*People keep it at home.*) · Clue 4: 「「ワンワン」と なきます。」 (*It goes "wan-wan".*) → answer: いぬ (犬). The player answers ねこ at clue 3 → wrong, receives clue 4 → いぬ ✓. Feedback compares the two words: いぬ「ワンワン」/ ねこ「ニャー」.
9. **Progression:** clues without glosses; clues with kanji (furigana only on kanji not yet mastered); more abstract clues (「〜するときに つかいます」 *used when you do ~*); abstract categories (feelings, occupations); reverse mode: the player *chooses* clues to make the bot guess (selecting from pre-generated sentences—evaluative reading).
10. **Data reuse:** semantic attributes from `words[]` + sentence templates (`clueTemplates[]`) + known-vocabulary checker.
11. **Complexity:** very low (data requires curation—the cost lies in the content, not the code).
12. **Cost:** minimal.
13. **Replayability:** high (the same word can have many combinations of clues).
14. **Risks:** clues containing unknown words become frustrating—the generator should guarantee ≥ 95% known lexical coverage (the Nation/Laufer comprehension threshold). Avoid ambiguous riddles (accept all answers consistent with the clues shown).
