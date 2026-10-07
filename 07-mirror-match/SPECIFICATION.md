# 07 — Mirror Match

**Catalogue ID:** 07.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 7.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 7. Mirror Match

1. **Name:** Mirror Match
2. **Concept:** a memory game (*Concentration*) in which each pair represents the same sound in hiragana and katakana — and, later, the same word written in different scripts.
3. **How it works:** face-down cards in a 4×4 to 6×6 grid; turn over two; a pair = the same sound (か/カ). "Quick mirror" variant: two columns, connect pairs with lines in 30 s. Advanced variant: *kanji word ↔ kana reading* (山 ↔ やま, 水 ↔ みず). Note: do not create "katakana word ↔ the same word in hiragana" pairs (パン ↔ ぱん), because this would teach spellings that real Japanese does not use.
4. **Action per round:** remember positions + identify correspondences between scripts.
5. **Skill:** mapping katakana onto previously learned hiragana (transfer), then kanji↔reading.
6. **Why it helps:** katakana is learned faster when anchored to hiragana (same structure, associative learning), and the memory format requires keeping the forms in working memory. Confusable pairs (ソ/ン, シ/ツ) appear together on the same board.
7. **Level:** beginner (phase 2); kanji variant: advanced beginner.
8. **Example:** board with し, シ, つ, ツ, ん, ン, そ, ソ. The player turns over シ and つ → not a pair; minimal feedback: "シ = shi". Players often make errors here on exactly the pair they need to practice.
9. **Progression:** more cards; less viewing time; all pairs confusable; "no flipping" version (speed); then kanji↔reading and kanji↔meaning pairs.
10. **Data reuse:** `kana[]` (`pairId` field), then `kanji[]`/`words[]`.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium (good as a 2 min break).
14. **Risks:** the memory game trains *spatial* memory more than reading — limit to ≤ 2 rounds per session and always finish with a retrieval round without positional cues (e.g., Kana Rain in katakana mode).
