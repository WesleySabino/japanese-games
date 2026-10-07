# 29 — Context Detective

**Catalogue ID:** 29.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 29.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 29. Context Detective

1. **Name:** Context Detective
2. **Concept:** an unknown word appears highlighted in increasingly revealing sentences; the player infers its meaning as early as possible.
3. **How it works:** “case” = 1 new target word + 3 clue sentences (all with ≥ 95% known vocabulary, except the target). After each clue, the player can “make an accusation”: choose a semantic field among 6 (lower level), type an English keyword (validated against a synonym list), or — at a higher level — choose a simple Japanese definition. A correct answer with 1 clue = 3 stars. After the case, the word enters the Scheduler as a “new item learned through inference” with a special flag (high review priority within 24 h).
4. **Action per round:** read the context → use syntactic clues (particle, position), semantic clues, and kanji clues (components!) → formulate and test a hypothesis.
5. **Skill:** lexical inference from context — the number 1 strategy of extensive readers; also using kanji components to guess.
6. **Why it helps:** most of a fluent reader’s vocabulary comes from reading, not lists; inference is a trainable skill. The effort of deduction (*desirable difficulty*) and the “aha” moment create strong memories. Presenting the word in several contexts gives it richer meaning than a gloss.
7. **Level:** pre-intermediate → intermediate (simple version at upper beginner).
8. **Example (upper beginner):** target かわいた: 1) 「あつい 日に たくさん はしりました。」 2) 「のどが かわいたので、みずを のみました。」 → *thirsty* (literally, *the throat got dry*). **Example (intermediate):** target 欠かさない: 1) 「彼は 毎朝、公園で ジョギングを する。」 2) 「雨の 日も 欠かさない。」 3) 「もう 十年、一日も 欠かしたことが ない。」 → *never misses / never skips*. Kanji clue: 欠 appears in 欠席 (*absence*).
9. **Progression:** subtler clues; fewer clues; more abstract targets; multiple targets per text; ask the player to *distinguish* the target from a close synonym (e.g. 必ず vs きっと).
10. **Data reuse:** search `sentences[]` for sentences containing the target with lexical coverage (for this player) ≥ 95% — a direct query of the learner model.
11. **Complexity:** low (the challenge is curation/automatic filtering).
12. **Cost:** minimal.
13. **Replayability:** high (each new word is a new case).
14. **Risks:** consolidating an incorrect inference — always confirm with the definition at the end and present the item again soon; avoid targets with genuinely ambiguous contexts (the curator/heuristic evaluates clue “informativeness,” e.g. with A/B tests of accuracy rates).
