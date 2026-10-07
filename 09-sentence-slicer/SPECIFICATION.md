# 09 — Sentence Slicer

**Catalogue ID:** 09.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 9.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 9. Sentence Slicer

1. **Name:** Sentence Slicer
2. **Concept:** Japanese has no spaces; the player "slices" a continuous line of text at the correct points between words and particles.
3. **How it works:** an unspaced sentence on one line; the player taps/drags between characters to insert cuts. On confirmation, each correct piece lights up and shows a short gloss when tapped. Points for correct cuts, penalties for incorrect cuts; time bonus. The sentence database has precalculated tokenization (offline, with MeCab/Sudachi), so the game simply compares indices.
4. **Action per round:** read, recognize known words and particles, and mark boundaries.
5. **Skill:** segmentation (*parsing*) — perhaps the most underestimated skill in Japanese reading; recognizing particles, verb endings, and words as units.
6. **Why it helps:** fluent Japanese readers segment using script alternation (kanji = content, hiragana = grammar) and known words. Explicitly practicing this from the beginning, in kana-only sentences, greatly speeds up the transition to texts. It is pure *pattern recognition*, with little of a "classroom exercise" feel.
7. **Level:** absolute beginner (very short kana sentences) → intermediate (long sentences with kanji).
8. **Example (phase 1):** わたしはがくせいです → わたし｜は｜がくせい｜です. Glosses: *I | (topic) | student | am*. **Example (phase 6):** 昨日友達と駅前の喫茶店でコーヒーを飲みました → 昨日｜友達｜と｜駅前｜の｜喫茶店｜で｜コーヒー｜を｜飲みました. Note: the game accepts "word" granularity (飲みました as one unit) or "morpheme" granularity (飲み｜まし｜た), depending on the mode; bunsetsu/word is the default, to avoid turning it into a morphology lesson.
9. **Progression:** kana-only → kana+kanji (easier to segment, teaching the *value* of kanji!); longer sentences; time; "slice a paragraph" mode; "slice and classify" mode (mark the particle in a different color).
10. **Data reuse:** `sentences[].tokens[]` (offsets and `wordId`); each correct token counts as contextual exposure for the corresponding word in the learner model.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** high (a virtually infinite sentence source: Tatoeba + generated sentences).
14. **Risks:** segmentation ambiguity (e.g., ここではきものをぬぐ — "ここで はきものを" vs "ここでは きものを") — the game must accept valid alternative segmentations or *use* these ambiguities as an explained bonus challenge. Avoid excessively technical morphological rules.
