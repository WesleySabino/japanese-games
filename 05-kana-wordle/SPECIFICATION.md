# 05 — Kana Wordle

**Catalogue ID:** 05.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 5.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 5. Kana Wordle

1. **Name:** Kana Wordle (かなドル)
2. **Concept:** guess the secret kana word in 6 attempts, with color feedback — and an extra layer of "gojūon" feedback that teaches the system.
3. **How it works:** words of 3–4 moras (all from vocabulary the player has already *seen*). Feedback: 🟩 correct kana in the correct position; 🟨 kana exists in another position; 🟦 **same row** (correct consonant, wrong vowel — e.g., guess か, target き); 🟪 **same column** (correct vowel). A virtual kana keyboard in a gojūon grid accumulates the colors. Only guesses that are *real words in the database* are accepted.
4. **Action per round:** retrieve vocabulary words that fit the constraints (production + reasoning).
5. **Skill:** kana vocabulary (production), spelling, and gojūon structure.
6. **Why it helps:** each guess is constrained free recall of vocabulary (the most demanding form of *retrieval practice*), and the player mentally reviews dozens of words to generate candidates — "hidden" review. After solving, the game displays the word in kanji (if applicable) + meaning + an example sentence, creating a moment of *contextual exposure*.
7. **Level:** beginner (after ~150 words).
8. **Example:** target とけい (*clock*). Guess 1: さくら (*cherry blossom*) → さ ✗ · く 🟦 (correct k-row in position 2, wrong vowel) · ら ✗. The player deduces: position 2 is か/き/け/こ. Guess 2: とおい (*far*) → と 🟩 · お ✗ · い 🟩. Guess 3: とけい → 🟩🟩🟩. Final screen: 時計 (とけい) — *clock, watch*. 「へやに とけいが ありません。」 *There is no clock in the room.*
9. **Progression:** 3→4→5 moras; the target dictionary follows learned vocabulary; katakana mode; "hard" mode (revealed clues must be used); kanji-compound mode (2 kanji, component-level feedback — advanced).
10. **Data reuse:** `words[]` (targets = items due for review; accepted guesses = all "seen" items).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** very high (proven daily format, shareable).
14. **Risks:** (a) a strategy of "burning through kana" without considering meaning — mitigation: guesses only from known words and a meaning tooltip for each guess; (b) a small target vocabulary in the first weeks — combine with words from the pack currently being studied.
