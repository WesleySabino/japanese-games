# 26 — Flash Scene (○✕)

**Catalogue ID:** 26.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 26.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 26. Flash Scene (○✕)

1. **Name:** Flash Scene (○✕クイズ)
2. **Concept:** an emoji “picture” and a Japanese sentence appear; the player decides within seconds whether the sentence describes the scene (○) or not (✕).
3. **How it works:** the scene is a CSS grid with positioned emojis (🐈 above 🪑, 🌧️ in the sky, 🕒 on the clock). The sentence is generated from templates using the *same* scene data structure, true or false with a minimal change (position, number, color, subject, verb tense, negation). Swipe right/left or use the ←/→ keys. Sequences of 20 sentences in ~60 s; adaptive pacing.
4. **Action per round:** read the entire sentence (including the ending: negation and tense are at the end!) → compare it with the scene → decide.
5. **Skill:** fast, *direct* sentence comprehension (without translation); attention to sentence endings (〜ます/〜ません/〜ました), position particles (うえ・した・なか・まえ・うしろ・となり).
6. **Why it helps:** checks actual comprehension with minimal response effort (high input density: 20 sentences per minute). The minimal change between true and false sentences forces processing of *every* element — especially the verb ending, which beginners ignore. No English on screen: it is the purest bridge to direct reading.
7. **Level:** beginner (phase 3) → intermediate (long sentences, inferences).
8. **Example:** scene: 🐈 under 🪑, 🍎🍎🍎 on the table. Sentences: 「ねこは いすの したに います。」 → ○ · 「りんごが 二つ あります。」 → ✕ (there are three) · 「ねこは いすの うえに いません。」 → ○ (negation!). Advanced level (text as the scene): mini-text 「田中さんは 傘を 持たずに 出かけた。午後、雨が 降った。」 → 「田中さんは ぬれたかもしれない。」 → ○ (inference).
9. **Progression:** short → long sentences; negation and past tense; counterfactuals; quantifiers (だけ, しか〜ない, も); scenes replaced by mini-texts (inference); time per sentence adapted to measured reading speed.
10. **Data reuse:** `sceneTemplates[]` + `words[]` with visual attributes (`emoji`); procedurally generated sentences (Section 5.3), plus curated sentences for higher levels.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** very high.
14. **Risks:** a 50% chance of guessing correctly — compensate with scoring that penalizes errors (score = correct answers − errors), detection of overly fast responses (< estimated minimum reading time for the sentence), and an occasional “explain” mode (where is the error? tap the false word).
