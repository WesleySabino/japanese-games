# 01 — Kana Rain

**Catalogue ID:** 01.
**Status:** implemented; see also [README.md](./README.md).
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 1.

The 14 fields below are an English translation of the complete original catalogue entry, including its examples, risks, and caveats. Proposed improvements are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm's shared guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue entry — English translation

### 1. Kana Rain

1. **Name:** Kana Rain.
2. **Concept:** kana fall from the top of the screen, and the player "breaks" them by typing or tapping the corresponding sound before they reach the ground.
3. **How it works:** each drop is a DOM element animated with `transform: translateY` through CSS, or `requestAnimationFrame` with a single loop. The player types the sound (phases 0–1: romaji; later: selects the hiragana↔katakana counterpart on a kana keyboard, or types the reading of a whole word). Correct answers remove the drop; errors make it accelerate and "stain" the screen until it is answered correctly. Three drops hitting the ground end the game. Waves are assembled by the Scheduler: approximately 60% review items, 25% weak items, and 15% new items.
4. **Action per round:** see the character → recall its sound → type → receive immediate feedback (on an error, the correct sound is displayed within 300 ms, alongside the character it was confused with).
5. **Skill:** automatic kana→sound recognition (decoding), followed by katakana↔hiragana correspondence, then whole words in kana.
6. **Why it helps:** automatic decoding is a prerequisite for reading; if each kana takes 500 ms, little working memory remains for meaning. The game trains *automaticity* (fluency) through active recall (producing the sound rather than choosing it), while the spacing between drops prompts a quick attempt without adjacent visual cues.
7. **Level:** absolute beginner (phases 0–2), with a word mode extending into beginner level.
8. **Example round:** か, き, さ, and ち fall. The player types `ka` ✓, `ki` ✓, then `chi` for the さ drop ✗ → feedback: "さ = sa (you typed chi → ち)". Both さ and ち reappear side by side in the next wave (deliberate interleaving). Word mode (phase 3): ねこ falls — type `neko`; a tooltip after the correct answer says *cat*.
9. **Progression:** (a) adjust fall speed to maintain approximately 85% accuracy; (b) expand from one row (あいうえお) to the full gojūon; (c) add dakuten and combinations (ぎゃ, しょ); (d) mix hiragana and katakana; (e) use whole words; (f) introduce "acid rain": drops containing kana the player tends to confuse.
10. **Shared data reuse:** uses `kana[]` and, in word mode, `words[]` filtered by `script = kana-only` and frequency; the confusion list comes from `learner.confusions`.
11. **Complexity:** low.
12. **Runtime cost:** very low (≤ 20 simultaneous DOM nodes, one animation loop).
13. **Replayability:** high in the early phases (personal best per set, daily challenge); falls after kana are mastered, which is why the game transitions to word mode.
14. **Risks:** (a) training romaji as a permanent intermediate step — mitigation: romaji disappears per item when the kana reaches mastery; the answer then uses kana or meaning; (b) guessing under pressure — speed only increases when accuracy is ≥ 85%; (c) focusing on isolated characters — word mode becomes mandatory from phase 1b.
