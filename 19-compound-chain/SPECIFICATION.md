# 19 — Compound Chain

**Catalogue ID:** 19.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 19.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 19. Compound Chain

1. **Name:** Compound Chain (熟語しりとり).
2. **Concept:** kanji shiritori: each two-character compound must begin with the previous compound's final kanji; the player builds the longest possible chain using a "hand" of kanji.
3. **How it works:** the player receives a hand of 8 kanji tiles and a starting word. Each turn, they choose a tile that forms a valid compound (from the bank) with the final kanji. Scoring rewards length and inverse frequency (rarer words are worth more), with a bonus for **closing the cycle** (returning to the initial kanji). Strategic element: save tiles that open many possibilities.
4. **Action per round:** given the final kanji, assess which tiles in the hand form real compounds and which leave good options for the next step.
5. **Skill:** compound network, compound reading (each move requires typing or confirming the reading), kanji productivity.
6. **Why it helps:** this is generative retrieval with planning: the player considers several words per move. Reading confirmation prevents "getting it right only by form."
7. **Level:** pre-intermediate → intermediate.
8. **Example (cycle):** 学生 (がくせい, *student*) → 生活 (せいかつ, *daily life*) → 活動 (かつどう, *activity*) → 動物 (どうぶつ, *animal*) → 物語 (ものがたり, *story*) → 語学 (ごがく, *language study*) → back to 学: **complete cycle, ×2 bonus**.
9. **Progression:** smaller hand; timer; mandatory typed reading; cooperative version with a bot; "themed chain" (only words from one field: 天気, 気温, 温度...).
10. **Data reuse:** `kanji → compounds` graph derived from `words[]`.
11. **Complexity:** low (searching a small graph).
12. **Cost:** minimal.
13. **Replayability:** high.
14. **Risks:** rewarding excessively rare words—limit words to the phase's frequency rank + one "new word" per game, introduced and scheduled.
