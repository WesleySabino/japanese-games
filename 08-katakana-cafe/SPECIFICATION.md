# 08 — Katakana Café

**Catalogue ID:** 08.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 8.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 8. Katakana Café

1. **Name:** Katakana Café (カタカナ・カフェ)
2. **Concept:** you are a server in a Japanese café; customers order menu items in katakana, and you must decode them to serve the correct dish.
3. **How it works:** an "order" appears (e.g., ハンバーガー). The player must identify the item: in the initial phases, by tapping the correct icon/emoji on a tray of 6; later, by typing the English source word (with spelling tolerance); then the reverse — not listening (no audio!) — seeing the item and *assembling* the katakana from tiles. Orders speed up; "impatient" customers give bigger tips. Includes real traps: non-English loanwords (パン, from the Portuguese word for *bread*; アルバイト, from German *Arbeit*) and "false friends" (マンション = *apartment*, not *mansion*; スマート = *slim*).
4. **Action per round:** decode katakana → reconstruct the sound → map it to the source word (phonological deduction: ー = long vowel, ッ = doubled consonant, epenthetic vowels).
5. **Skill:** fluent katakana reading; phonological adaptation rules for loanwords (e.g., "cup" → カップ; "milk" → ミルク; "computer" → コンピューター).
6. **Why it helps:** for a learner using English as a base, gairaigo offer an enormous vocabulary "shortcut" (tens of thousands of words), but only if the learner understands the *adaptation system*. The game turns this into deduction, generating deep processing (*levels of processing*). A Brazilian learner's curiosity about パン, カステラ (*Castella*, from Castile via Portuguese), and テンプラ supports memory through elaboration.
7. **Level:** beginner (phase 2), with advanced mode at pre-intermediate level (long words, false friends).
8. **Example:** orders: コーヒー → ☕ *coffee*; サンドイッチ → 🥪 *sandwich*; アイスクリーム → 🍨; パン → 🍞 "Fun fact: パン comes from the Portuguese word for bread!". Trap: ミルクティー vs ミルク — two similar trays.
9. **Progression:** short words → long words; icons → typing → reverse assembly; time; menu without icons (only Japanese text with prices: 「コーヒー 300円」) and combined orders ("コーヒーと ケーキを ください"), naturally introducing と and ください.
10. **Data reuse:** `words[]` with `origin: "en" | "pt" | "de" | ...` and `script: "katakana"`, plus optional `emoji`.
11. **Complexity:** low.
12. **Cost:** minimal (native emoji, no images).
13. **Replayability:** high (theme, pace, themed menus: café, electronics store, sports).
14. **Risks:** (a) reinforcing "katakana = English" — mitigate with loanwords from other languages and wasei-eigo; (b) dependence on English as a permanent bridge — in higher phases, orders become Japanese descriptions.
