# 14 — Radical Alchemy

**Catalogue ID:** 14.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 14.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 14. Radical Alchemy

1. **Name:** Radical Alchemy.
2. **Concept:** the player combines components in a "cauldron" to create kanji—discovering that kanji are built from meaningful pieces.
3. **How it works:** an inventory of unlocked components (木, 日, 月, 口, 亻, 女, 子, 田, 力, 氵, 言...). Combining two or three pieces produces a kanji if it exists in the phase's kanji bank; the discovered kanji enters the "grimoire" with its meaning, a common word, and a mnemonic generated from its decomposition. There are **missions**: "Create the kanji for *rest*" (the player must infer: person + tree). Invalid combinations give a hint ("close! you need a person-component"). Produced kanji become new ingredients (林 + 木 → 森).
4. **Action per round:** read the mission (target meaning) → reason about components → combine.
5. **Skill:** decomposing kanji into components; component→meaning association; a foundation for recognizing thousands of kanji.
6. **Why it helps:** learning kanji through components drastically reduces the burden (≈ 200–300 components cover the 2,136 jōyō), and *discovery* creates a generation effect and elaborative mnemonics. It also prepares the player to infer the meaning of new kanji.
7. **Level:** advanced beginner (phase 4).
8. **Example:** Mission: "*rest*". Inventory: 亻(person), 木 (tree), 日 (sun), 月 (moon). The player combines 亻+木 → **休** (やす-む, *rest*): "A person leaning against a tree." Word: 休み (やすみ, *holiday, break*). Next mission: "*bright*" → 日+月 → **明** (あか-るい, *bright*) → word 明日 (あした, *tomorrow*). Chaining: 木+木 → 林 (はやし, *grove*), 林+木 → 森 (もり, *forest*).
9. **Progression:** combinations of 2 → 3 pieces; components whose positions vary (氵 on the left, 艹 at the top); missions with a vague meaning ("*something related to speech*" → 言+舌 = 話, 言+吾 = 語); reveal that many kanji are phonosemantic (日 + 寺 = 時: 日 supplies the meaning "time," 寺 supplies the sound ジ).
10. **Data reuse:** `kanji[].components` (from KanjiVG/IDS, with English component names) + `kanji[].keyword`.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium-high (collection, discovery; reusable as a "laboratory" whenever new components are unlocked).
14. **Risks:** (a) false etymology—mnemonics must be labeled "memory aid," not historical etymology; (b) practicing only kanji→meaning and neglecting readings and words—each discovered kanji comes with 1 real word and is scheduled for reading games (16, 17); (c) components with little use for the beginner.
