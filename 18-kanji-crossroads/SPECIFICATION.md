# 18 — Kanji Crossroads

**Catalogue ID:** 18.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 18.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 18. Kanji Crossroads

1. **Name:** Kanji Crossroads (和同開珎—*wadō kaichin* puzzle).
2. **Concept:** an adaptation of a real Japanese pastime: four kanji surround an empty space; the player discovers the central kanji that forms a compound word with each of them.
3. **How it works:** a cross with an empty center. Arrows indicate reading direction: top→center, left→center, center→right, center→bottom. The player types the central kanji's reading or chooses from kanji tiles (with distractors from the visual graph). On a correct answer, the four words are displayed with reading and meaning.
4. **Action per round:** generate hypotheses for compounds with each outer kanji and find the intersection.
5. **Skill:** knowledge of the compound network (熟語), kanji productivity, intermediate-level vocabulary.
6. **Why it helps:** retrieval with multiple constraints: each tested hypothesis activates several compounds (broad review); the intersection requires knowledge of real words, not isolated kanji. It reveals the structure of Sino-Japanese vocabulary, accelerating acquisition of new words (the learner begins to "see" 学 in 学校, 学生, 大学...).
7. **Level:** pre-intermediate → intermediate.
8. **Example:**
   ```
          大
          ↓
   入 →  ？ → 生
          ↓
          校
   ```
   Answer: **学** → 大学 (だいがく, *university*), 入学 (にゅうがく, *school admission*), 学生 (がくせい, *student*), 学校 (がっこう, *school*). Another: top 天, left 元, right 分, bottom 温 → **気**: 天気 (*weather*), 元気 (*healthy, energetic*), 気分 (*mood*), 気温 (*air temperature*).
9. **Progression:** frequent compounds → less frequent ones; hints (the reading of one word) removed; "double crossroads" (two connected centers); timed mode.
10. **Data reuse:** `compoundsByKanji` index generated from `words[]` (only words with known kanji); the generator looks for central kanji with ≥ 4 compounds known to the player (or 3 known + 1 new high-frequency compound, introduced as learning).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** high (huge combinatorial variety; ideal as a daily challenge).
14. **Risks:** multiple valid solutions (accept any kanji that forms the 4 words in the bank); vocabulary dependence—generate only when the player knows ≥ 3 of the 4 words.
