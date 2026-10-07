# 17 — On/Kun Switch

**Catalogue ID:** 17.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 17.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 17. On/Kun Switch

1. **Name:** On/Kun Switch (音訓).
2. **Concept:** the same kanji appears in different words, and the player must write the correct reading of *that word*—practicing the contextual choice of on'yomi/kun'yomi.
3. **How it works:** a series of 6–10 words sharing a highlighted kanji. For each one, the player types the complete reading in kana (production), or assembles it with tiles at lower levels. Heuristic clues are *taught by the game* as the player makes mistakes: kanji alone/with okurigana → usually kun; a compound of 2+ kanji → usually on; exceptions (jukujikun: 明日 あした, 今日 きょう, 大人 おとな) receive a "special reading" badge.
4. **Action per round:** observe the word's structure (alone? okurigana? compound?) → decide on/kun → produce the reading, including rendaku and sokuon (一生 いっしょう).
5. **Skill:** reading kanji in real words; awareness of reading rules.
6. **Why it helps:** knowing "人 = ジン, ニン, ひと" as a list does not help with reading; what matters is choosing the correct reading *in a word*. Varying the context of the same kanji is interleaved practice at the most useful level.
7. **Level:** advanced beginner → pre-intermediate.
8. **Example:** kanji 人: 人 → ひと · 日本人 → にほんじん · 三人 → さんにん · 一人 → ひとり (special!) · 大人 → おとな (special!) · 人気 → にんき. Kanji 生: 先生 → せんせい · 学生 → がくせい · 生まれる → うまれる · 生きる → いきる · 一生 → いっしょう.
9. **Progression:** kanji with 2 readings → kanji with many (生, 下, 上); misleading okurigana (上がる あがる / 上る のぼる); rendaku (手紙 てがみ); words within sentences (context decides: 「下手」 へた vs したて—avoid rare ambiguities).
10. **Data reuse:** `words[]` indexed by kanji (`byKanji[k]`), `kanji[].on/kun`, flags `jukujikun`, `rendaku`.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium-high (each kanji is a "level").
14. **Risks:** becoming rote memorization of readings without meaning—always display a gloss after the answer and schedule the word in context games; do not introduce rare words just to illustrate a reading.
