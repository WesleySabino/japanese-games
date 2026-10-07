# 31 — Text Explorer

**Catalogue ID:** 31.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 31.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 31. Text Explorer

1. **Name:** Text Explorer
2. **Concept:** a short text is a “territory” to explore with scavenger-hunt missions: find all foods, discover where the character went, tap all past-tense verbs — with a limited budget of dictionary lookups.
3. **How it works:** an 80–400-character text, rendered with clickable tokens (spans). Missions of 3 types: *scanning* (find specific information), *categorizing* (tap every X), *comprehension* (answer a question by tapping the sentence that proves the answer). Looking up a word (long press) spends a “lantern” (budget of 3–5), shows its reading + gloss, and records the word as “looked up” in the learner model. Adaptive furigana: only over kanji whose reading the player has not yet mastered.
4. **Action per round:** read with a purpose → locate evidence → decide when to spend lookups.
5. **Skill:** purposeful reading, *scanning*, controlled extensive reading, managing unknown words.
6. **Why it helps:** real reading involves goals and tolerance of uncertainty; the lookup budget teaches not to translate everything (a fluent-reader strategy) and generates valuable data (looked-up words = words to teach). “Tapping the evidence” checks comprehension without multiple choice.
7. **Level:** pre-intermediate → intermediate (kana version in phase 5).
8. **Example:** text: 「日曜日、わたしは 友だちと 町へ 行きました。まず、パン屋で パンを 二つ 買いました。それから、公園で 昼ご飯を 食べました。友だちは おにぎりを 食べましたが、わたしは パンを 食べました。夕方、雨が 降ったので、早く 帰りました。」 Missions: (1) “Tap every food” → パン, 昼ご飯, おにぎり, パン; (2) 「どうして 早く 帰りましたか。」 → tap 「雨が 降ったので」; (3) “Tap all past-tense verbs” (5).
9. **Progression:** longer texts; fewer lanterns; reduced furigana; inference missions (「わたしは パンが すきだと 思いますか。」); varied genres (email, announcement, diary, simplified news).
10. **Data reuse:** tokenized `texts[]` (`wordId` per token), mission metadata generated from tags (`food`, `verb.past`) + curated questions.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium (per text) — high through the text library and multiple missions per text.
14. **Risks:** texts above the player’s level (frustration) — select by coverage ≥ 95–98% (Section 3); missions solvable through visual patterns (e.g. tap everything ending in た) — combine with meaning questions.
