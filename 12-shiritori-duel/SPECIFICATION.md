# 12 — Shiritori Duel

**Catalogue ID:** 12.
**Status:** proposal; not yet implemented.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 12.

The following 14 fields are an English translation of the original catalogue, including all examples, risks, and caveats. Suggestions are kept separately in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolds, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue — English translation

### 12. Shiritori Duel

1. **Name:** Shiritori Duel (しりとり対決)
2. **Concept:** the classic Japanese word game: each word starts with the previous word's final kana; anyone who uses a word ending in ん loses.
3. **How it works:** play against a bot that uses the *player's own vocabulary* (seen words), plus some new high-frequency words (introduced with a gloss when the bot uses them — learning through exposure). The player types in kana (virtual gojūon keyboard) or assembles tiles. A timer per move. Configurable rules: nouns only, unrestricted ゛ (か↔が), long vowels ignored (コーヒー → ひ).
4. **Action per round:** given the final kana, freely recall a word starting with it — and avoid ending in ん or leaving the bot an easy position.
5. **Skill:** free recall (production) of vocabulary indexed by initial sound; spelling.
6. **Why it helps:** free recall is the strongest form of retrieval practice, and the "first kana" index offers an access route different from the "meaning" used in other games (cue variability strengthens memory). There is real strategy: choosing difficult endings (る, ぬ, ぷ) for the bot.
7. **Level:** beginner (≥ 200 words) → all levels.
8. **Example:** Bot: りんご (*apple*) → Player considers ごはん but notices the final ん (would lose) → plays ごま (*sesame*) ✓ → Bot: まど (*window*) → Player: どうぶつ (*animal*) ✓ → Bot: つくえ (*desk*) → Player: えき (*station*) ✓ → Bot: きって (*stamp*; if new to the player, the gloss appears) → Player: テレビ (*TV*; mixed scripts accepted) ✓ → Bot: びょういん ✗ — the bot ended in ん: player wins.
9. **Progression:** stronger bot (chooses rare endings); less time; thematic restriction ("food only"); kanji mode (the player must write the word in kanji if they know it — bonus); "compound shiritori" (see game 19, Compound Chain).
10. **Data reuse:** `words[]` indexed by first and last kana (precalculated index).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** very high.
14. **Risks:** frustration when vocabulary is small (getting stuck on る) — offer a "hint" showing the meaning of a known candidate word (without its form), turning help into a new retrieval opportunity.
