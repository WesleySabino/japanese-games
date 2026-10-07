# 16 — Triads

**Catalogue ID:** 16.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 16.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 16. Triads

1. **Name:** Triads.
2. **Concept:** on a board of mixed tiles—kanji/words, readings, and meanings—the player forms correct triples (form + reading + meaning), as in the card game SET.
3. **How it works:** a board with 9–15 tiles (3–5 triples). Reading and meaning tiles include *plausible* distractors (homophones, synonyms, similar-looking kanji). Selecting a correct triple removes it and introduces new tiles (continuous flow for 90 s). An incorrect triple "locks" the tiles for 2 s and records exactly which facet failed (reading or meaning).
4. **Action per round:** choose an anchor tile → retrieve the two missing facets → locate them on the board among distractors.
5. **Skill:** kanji–reading–meaning association, the central triad of kanji reading.
6. **Why it helps:** the kanji learner's biggest problem is knowing the meaning but not the reading (or vice versa). Requiring all three facets together consolidates the connection, and the learner model receives separate evidence for each facet. Distractors (かわ: 川 *river* vs 皮 *skin*) force discrimination.
7. **Level:** advanced beginner (isolated kanji) → pre-intermediate (compounds).
8. **Example:** tiles: 山 · 川 · 火 · やま · かわ · ひ · さん · *mountain* · *river* · *fire* · *day*. Triples: 山–やま–*mountain*; 川–かわ–*river*; 火–ひ–*fire*. Extra tiles: さん (the on'yomi reading of 山—also valid: the game accepts 山–さん–*mountain* as an on'yomi triple, with a bonus) and *day* (the meaning of 日, which is also read ひ: it is a phonological distractor for 火–ひ). Phase 6: 先生–せんせい–*teacher*; 学生–がくせい–*student*; 生活–せいかつ–*daily life*.
9. **Progression:** more tiles; compounds with similar readings (せいかつ / せいかく); meanings in simple Japanese instead of English; "example sentence" tiles replacing the meaning (the fourth facet: context).
10. **Data reuse:** `kanji[]`, `words[]` (`surface`, `reading`, `glossEn`), `confusionGraph` (phonological + visual + semantic).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** high.
14. **Risks:** solving by elimination (at the end, 3 obvious tiles remain)—mitigate with a continuous flow (there are always ≥ 9 tiles) and "orphan" tiles with no triple.
