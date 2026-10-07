# 02 — Gojūon Board

**Catalogue ID:** 02.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 2.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 2. Gojūon Board

1. **Name:** Gojūon Board (五十音の盤)
2. **Concept:** a puzzle in which the player reconstructs the gojūon chart by dragging kana tiles into the correct cells, discovering the consonant×vowel logic.
3. **How it works:** a grid with 5 columns (a i u e o) × N rows (∅, k, s, t, n, h, m, y, r, w). Some cells are prefilled as anchors; the player places the remaining tiles. Variations: "chart with gaps" (one kana missing per row), "shuffled chart" (swap pairs of cells until ordered, in the style of a *15-puzzle*), "mirror chart" (build the katakana chart from the hiragana chart).
4. **Action per round:** choose a tile, infer its row (consonant) and column (vowel), and place it; correct placements lock the tile.
5. **Skill:** a mental model of the syllabic system; relationships between rows (か→が, は→ば→ぱ); a foundation for understanding conjugations (which "move" through the columns: 書か・書き・書く・書け・書こ).
6. **Why it helps:** organizes 46+25+33 symbols into a *structure* (schema-based chunking), reducing memory load: learning "the k-row" means learning a pattern rather than 5 symbols. The chart will also be reused later to explain 五段 verbs — an investment that pays off.
7. **Level:** absolute beginner.
8. **Example:** incomplete "s" row: さ [ ] す せ [ ]. Available tiles: し, そ, ち, ろ. The player places し and そ; ち and ろ are distractors (ち is visually similar to さ, and ろ to る). Error feedback: "ち belongs to the T-row: た ち つ て と".
9. **Progression:** 1 row → 3 rows → full chart; then dakuten (が ざ だ ば ぱ), then combinations (きゃ きゅ きょ as a "sub-chart"), then timed katakana, then a "ghost chart" (without row/column labels).
10. **Data reuse:** uses only `kana[]` with `row`, `col`, `script`, and `variantOf` metadata.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium; excellent as a 60 s warm-up and a phase 1 "readiness check".
14. **Risks:** the player may solve it through position and logic without memorizing the form (e.g., knows the "o" in the s-row is missing → places the only remaining tile). Mitigation: always include visually confusable distractors and request a round without the grid at the end.
