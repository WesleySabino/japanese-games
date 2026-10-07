# 25 — Sentence Builder

**Catalogue ID:** 25.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 25.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 25. Sentence Builder

1. **Name:** Sentence Builder
2. **Concept:** shuffled sentence chunks (文節, *bunsetsu*) must be ordered to form a sentence matching a scene, a gloss, or — at higher levels — a Japanese paraphrase.
3. **How it works:** 3–7 draggable chunks (each chunk = content + particle, e.g. 「こうえんで」). The target initially is an English sentence; later, an emoji scene; then an equivalent Japanese sentence using different words. There may be 1 distractor chunk (wrong particle: 「こうえんに」). The validator accepts any grammatically valid order (Japanese permits flexible ordering before the verb) — calculated from the rules: verb at the end; modifier before the modified element.
4. **Action per round:** understand the target → identify each chunk’s function → arrange them, with the verb last.
5. **Skill:** SOV structure, particle functions, prenominal modification (relative clauses: 「きのう かった ほん」), and chunking.
6. **Why it helps:** reading Japanese requires “holding onto” chunks until the final verb; building sentences trains this structural expectation (head-final *processing*). Chunks, rather than isolated words, teach the natural reading unit of Japanese. This is structured production without requiring typing.
7. **Level:** upper beginner → pre-intermediate.
8. **Example:** target: *I run in the park every morning.* Chunks: 「はしります」「まいあさ」「わたしは」「こうえんで」 (+ distractor 「こうえんを」). Answer: 「わたしは まいあさ こうえんで はしります。」 (also valid: 「まいあさ わたしは こうえんで はしります。」). Level 6: target scene 📚👦🛒 (yesterday) → 「きのう / 買った / 本を / 読みました」 → 「きのう 買った 本を 読みました。」 *I read the book I bought yesterday.*
9. **Progression:** 3 → 7 chunks; particle distractors; relative clauses; connectives (〜て, 〜から, 〜けど); Japanese target (paraphrase: 「毎朝 公園を 走って います」→ build another form with the same meaning); optional time limit.
10. **Data reuse:** `sentences[].chunks` (generated from tokenization + a bunsetsu rule) and sentence glosses.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** high (large sentence corpus).
14. **Risks:** (a) solving through “surface clues” (the chunk with ます goes at the end) without understanding — therefore, higher levels require choosing between two constructions with different meanings (「犬が 猫を 追う」 vs 「猫が 犬を 追う」); (b) rejecting valid orders — the validator needs flexible word-order rules.
