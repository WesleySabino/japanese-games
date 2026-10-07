# 03 — Tricky Twins

**Catalogue ID:** 03.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 3.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 3. Tricky Twins

1. **Name:** Tricky Twins
2. **Concept:** a grid filled with one repeated character hides one or more nearly identical "impostors"; find them quickly.
3. **How it works:** a 4×4 to 8×8 grid with the target character repeated and 1–3 impostors drawn from the visual confusion graph (e.g., ぬ among め). The player taps the impostors; then must state (type or choose between 2 options) the sound of both characters. Time counts, and errors cost seconds.
4. **Action per round:** scan the grid, detect the difference, and name both characters.
5. **Skill:** fine visual discrimination — kana (さ/ち, ぬ/め, ね/れ/わ, る/ろ, シ/ツ, ソ/ン, ク/ケ/タ, コ/ユ, ウ/ワ/フ), then kanji (未/末, 土/士, 待/持, 問/間, 貝/見, 礼/札, 人/入/八).
6. **Why it helps:** many beginner reading errors involve *perception* rather than memory. Perceptual discrimination training with visual minimal pairs (analogous to phonological minimal-pair training) speeds up recognition and reduces persistent confusions. The second stage (naming) connects perception to retrieval.
7. **Level:** absolute beginner (kana) through pre-intermediate (kanji).
8. **Example:** a 6×6 grid of シ with two hidden ツ. After finding them: "シ = shi, ツ = tsu. Tip: シ's strokes rise from the lower left; ツ's fall from the top." Kanji variant: a grid of 持 with one 待: "持 (hold, も-つ) vs 待 (wait, ま-つ): 扌 hand vs 彳 going".
9. **Progression:** larger grid; subtler impostors; different fonts (gothic, mincho, system handwriting font if available) to generalize the form; less time; "zero impostors" (sometimes there are none — prevents reflexive tapping).
10. **Data reuse:** `confusionGraph` (visual), derived from component decomposition (KanjiVG/IDS) + the player's own recorded confusions.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium-high (short, competitive, time record).
14. **Risks:** becoming a purely visual spot-the-difference exercise without learning sound/meaning — which is why the second stage is mandatory. Avoid pairs the player has not studied yet.
