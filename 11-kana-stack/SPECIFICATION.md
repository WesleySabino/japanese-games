# 11 — Kana Stack

**Catalogue ID:** 11.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 11.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 11. Kana Stack

1. **Name:** Kana Stack
2. **Concept:** kana blocks fall into a well; the player positions them to form real words in horizontal or vertical lines, which then disappear (Tetris × crossword).
3. **How it works:** a 6×10 well in CSS grid. Each block is a kana (chosen to make word formation viable: the generator takes target words from the Scheduler and "slices" their moras into the block queue, with 20–30% noise). The next block is visible (strategy). Formed words are validated against known vocabulary; review target words are worth double. Vertical Japanese (縦書き, top to bottom) also counts — a cultural bonus.
4. **Action per round:** see the blocks, *generate* candidate words using the available kana (free recall), and plan positions.
5. **Skill:** vocabulary retrieval from partial clues (such as completing words), spelling.
6. **Why it helps:** the mechanic encourages "scanning" the mental lexicon many times per minute — retrieval practice with generation (the generation effect). A formed word displays its gloss and kanji for 1 s, connecting form to meaning.
7. **Level:** beginner → advanced beginner.
8. **Example:** the stack contains か, さ; ね falls? No word; さ falls → horizontal "かさ" (*umbrella*, 傘) ✓ → disappears, shows 傘 *umbrella*. Later: vertical に+ほ+ん → 日本.
9. **Progression:** speed; longer words are worth more; kanji blocks (phase 4+: 日, 本, 人 → 日本, 本人, 人口...); multiplier combos.
10. **Data reuse:** `words[]` and, in the kanji version, `words[]` filtered by known kanji.
11. **Complexity:** medium (grid logic, no rotation needed — blocks are 1×1).
12. **Cost:** low.
13. **Replayability:** very high.
14. **Risks:** the player continually forming the same short, easy words (かさ, いえ) — mitigate with diminishing scores for words repeated during the session and bonuses for words due for review.
