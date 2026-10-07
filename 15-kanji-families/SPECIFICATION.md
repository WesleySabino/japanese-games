# 15 — Kanji Families

**Catalogue ID:** 15.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 15.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 15. Kanji Families

1. **Name:** Kanji Families.
2. **Concept:** drag kanji into "family homes" defined by a shared component—semantic (氵 water) or phonetic (青 = セイ).
3. **How it works:** 2–4 "homes" with a leading component; kanji arrive one by one (queue or conveyor) and must go into the correct home. Once each home is complete, the game displays the discovered pattern ("all of these relate to water"; "all of these are read セイ"). "Intruder" variant: a family contains a kanji that *looks* as though it belongs but does not follow the reading rule (待 with 寺 is read タイ, not ジ).
4. **Action per round:** identify the component in a complex kanji → associate it with the family → (advanced phase) predict the on'yomi reading.
5. **Skill:** recognizing components within complex kanji; using phonetic components to infer readings.
6. **Why it helps:** around 60% or more of jōyō kanji are phonosemantic; recognizing families turns arbitrary memorization into *rules with exceptions*, improving retention and enabling inference about unknown kanji.
7. **Level:** advanced beginner → pre-intermediate.
8. **Example (semantic):** homes 氵(water) · 言 (speech) · 木 (tree). Kanji: 海 → 氵, 話 → 言, 林 → 木, 泳 → 氵, 読 → 言, 校 → 木, 酒 → 氵. **Example (phonetic):** home 青 (セイ): 晴 (晴れ *sunny*), 清, 静, 精 ✓ → "青-family usually reads セイ". Home 寺 (ジ): 時 (ジ), 持 (ジ), 侍 (ジ), 待 → ⚠️ exception: 待 is タイ.
9. **Progression:** less obvious components (亻 vs 彳; 礻 vs 衤); phonetic families; intruders; unlabeled families (the player groups freely and the game validates the rules they have "discovered").
10. **Data reuse:** `kanji[].components`, `kanji[].phoneticComponent`, `kanji[].on[]`.
11. **Complexity:** very low.
12. **Cost:** minimal.
13. **Replayability:** medium.
14. **Risks:** overgeneralizing phonetic rules—always include explicit exceptions; do not show families of kanji the player will never encounter in the current phase.
