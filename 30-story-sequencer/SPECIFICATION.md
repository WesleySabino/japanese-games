# 30 — Story Sequencer

**Catalogue ID:** 30.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 30.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 30. Story Sequencer

1. **Name:** Story Sequencer
2. **Concept:** sentences from a mini-story or recipe are shuffled; the player reorders them using connectives, verb tenses, and logic.
3. **How it works:** 4–7 sentence cards; drag to reorder. Lower levels: explicit markers (まず, つぎに, それから, さいごに). Higher levels: only cohesion clues (pronouns それ/その, causal clues だから/でも, lexical references, tense changes). Validation accepts plausible alternative orders defined in the content.
4. **Action per round:** read every sentence → identify the beginning/end → build the logical chain.
5. **Skill:** discourse-level comprehension — cohesion and coherence; connectives.
6. **Why it helps:** text comprehension depends on linking sentences (bridging inferences); the task requires rereading each sentence with a purpose (motivated repeated reading, which improves fluency).
7. **Level:** pre-intermediate (a version with markers at upper beginner).
8. **Example (recipe):** shuffled: 「さいごに、カレールーを いれます。」「まず、やさいを きります。」「それから、みずを いれて にます。」「つぎに、にくを いためます。」 → order: まず → つぎに → それから → さいごに. **Example (narrative without markers):** 「でも、さいふが ありませんでした。」「田中さんは コンビニに 行きました。」「だから、何も 買えませんでした。」「おにぎりを とって レジに 行きました。」 → 行きました → おにぎり... → でも... → だから...
9. **Progression:** more sentences; removing markers; longer sentences; entire paragraphs as cards; expository texts (問題 → 原因 → 解決).
10. **Data reuse:** `texts[]` with ordered `sentenceIds` and metadata for alternative orders.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium (a familiar text loses its appeal; a volume of texts is needed — see procedural generation of recipes/routines in Section 5.3).
14. **Risks:** solving only through markers without understanding — remove markers early and include comprehension questions after ordering.
