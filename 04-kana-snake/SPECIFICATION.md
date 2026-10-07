# 04 — Kana Snake

**Catalogue ID:** 04.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 4.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 4. Kana Snake

1. **Name:** Kana Snake
2. **Concept:** classic Snake, but the snake must eat kana in the order that spells the requested word.
3. **How it works:** a 12×12 grid in `<canvas>` or CSS grid. At the top: the target (phases 0–1: romaji + meaning "**sakana** – fish"; later, only the meaning "fish" or an image/emoji; then a Japanese definition). The grid contains the correct kana and 3–5 distractors (confusable kana and kana from the same word in the wrong order). Eating the correct kana grows the snake; an incorrect one shortens it and records the confusion.
4. **Action per round:** retrieve the word's written form → plan a route → execute.
5. **Skill:** orthographic production in kana (reading→form), including っ, ゃ, and long vowels.
6. **Why it helps:** this is *production* (stronger than recognition for memory), but in a playful format without a keyboard. Route planning keeps the item in working memory for several seconds (rehearsal), and distractors require discrimination (e.g., eating a full-size ゆ instead of a small ゅ).
7. **Level:** absolute beginner → beginner.
8. **Example:** target "train station" → えき. A grid with え, き (correct) and さ, ん, お (distractors; さ is visually close to き, and お to あ/え in the initial phase). Phase 1b: "ticket" → きっぷ: the grid contains きっぷ + つ (full-size) + ふ + ぶ. Eating full-size つ records a っ/つ confusion.
9. **Progression:** longer words; more distractors; speed; words with っ/ー/combinations; katakana (アイスクリーム); prompts without English.
10. **Data reuse:** `words[]` with the `kana` field; distractors via the kana `confusionGraph`.
11. **Complexity:** low.
12. **Cost:** very low.
13. **Replayability:** high (classic arcade, short).
14. **Risks:** motor skill dominating the score — mitigation: low speed by default, scoring weighted toward orthographic accuracy rather than survival; avoid very long words that become a reflex test.
