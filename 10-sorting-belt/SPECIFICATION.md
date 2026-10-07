# 10 — Sorting Belt

**Catalogue ID:** 10.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 10.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 10. Sorting Belt

1. **Name:** Sorting Belt
2. **Concept:** words travel along a conveyor belt, and the player drags them into boxes labeled *in Japanese* (たべもの, どうぶつ, ばしょ...) before they fall off the end.
3. **How it works:** 2–4 boxes with Japanese category labels (English glosses only during the first exposures). Words slide (CSS `transform`) from right to left; the player drags or uses directional swipes (mobile) / arrows (desktop). Categories may be semantic (food/animal/place), grammatical (verb/い-adjective/な-adjective), script/reading-based (on/kun), formality-based, or thematic ("cold things / hot things"). A "わからない" (*don't know*) box is available and carries a smaller penalty than an error — reducing guessing.
4. **Action per round:** read the word → access its meaning *without translating* → decide the category in < 3 s.
5. **Skill:** direct lexical access (form→concept), semantic categorization, then grammatical categories.
6. **Why it helps:** the player demonstrates understanding of the word without having to produce an English translation — an explicit step toward direct comprehension in Japanese (Section 5.5). Semantic classification generates deep processing and is excellent for interleaving (words from several lessons at once). Categories have Japanese labels that become vocabulary through exposure.
7. **Level:** beginner (phase 3) → pre-intermediate (abstract categories).
8. **Example:** boxes: たべもの (*food*) · どうぶつ (*animals*) · ばしょ (*places*). Belt: りんご → たべもの; いぬ → どうぶつ; えき → ばしょ; さかな → *ambiguous* (food AND animal) → accepts both and gives a "both!" bonus; 図書館 → ばしょ. Phase 5: boxes 「うごく」(*moves*) / 「うごかない」(*doesn't move*): 車 ✓ うごく, 山 ✓ うごかない.
9. **Progression:** 2→4 boxes; speed; kanji items; labels without glosses; more abstract categories (感情 *emotions*, 時間 *time*), grammatical categories, and "register" categories (です/ます vs plain form).
10. **Data reuse:** `words[].tags` (semantic, POS) — the same tag is used by dozens of games; tags come from Japanese WordNet / manual classification of high-frequency categories.
11. **Complexity:** low.
12. **Cost:** very low.
13. **Replayability:** high (category combinations are combinatorial).
14. **Risks:** answering correctly based on a word's "look" (e.g., everything in katakana goes into food) — mitigate with categories that cut across scripts; ambiguous words must be accepted, never penalized.
