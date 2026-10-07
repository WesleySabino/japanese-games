# 06 — Mark Forge

**Catalogue ID:** 06.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 6.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 6. Mark Forge

1. **Name:** Mark Forge
2. **Concept:** the player transforms one word into another by adding/removing ゛, ゜, っ, small ゃゅょ, and ー, like a blacksmith "hammering" sounds.
3. **How it works:** shows a base word and a target (English meaning or image). The player drags "tools" (゛, ゜, っ, ゃ, ゅ, ょ, ー) to the correct positions. Many words are real minimal pairs: かき (*persimmon*) → かぎ (*key*); ふく (*clothes*) → ふぐ (*pufferfish*); おばさん (*aunt*) → おばあさん (*grandmother*); きて (*come!*) → きって (*stamp*); びよういん (*beauty salon*) → びょういん (*hospital*). The generator accepts only pairs one diacritic operation apart where **both forms are real words in the database**.
4. **Action per round:** compare the word with the target meaning, deduce the missing orthographic transformation, and apply it.
5. **Skill:** precise kana spelling (dakuten, handakuten, sokuon, yōon, long vowel) and its semantic importance.
6. **Why it helps:** these details are the main source of kana reading errors, and beginners tend "not to see" small marks. Minimal pairs make the difference *meaningful* (it changes the meaning), increasing attention (*noticing*, Schmidt's hypothesis) and memory.
7. **Level:** absolute beginner (phase 1b) → beginner.
8. **Example:** base びよういん, target "hospital 🏥". The player drags a small ょ and replaces よ → びょういん ✓. Feedback: "びよういん (bi-yo-u-in) = beauty salon · びょういん (byo-u-in) = hospital. One small ょ changes everything."
9. **Progression:** 1 transformation → 2 transformations; katakana (ベッド *bed* vs ベット; バス *bus* vs パス *pass*); removing marks (reverse direction); "detection" mode (which of the two is the requested word, timed).
10. **Data reuse:** automatically generates pairs by cross-referencing `words[].kana` with an edit distance of 1 "diacritic" operation; keeps only pairs where both words exist in the database.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium (the set of real pairs is finite, but large with 5,000+ words).
14. **Risks:** introducing rare words just because they form a pair — filter by frequency (both below a rank threshold) or label the rare word "only for this game" without requiring it later.
