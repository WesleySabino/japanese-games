# 24 — Particle Ninja

**Catalogue ID:** 24.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 24.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 24. Particle Ninja

1. **Name:** Particle Ninja
2. **Concept:** sentences arrive with “holes” in their particle positions; the player throws particle shurikens (は, が, を, に, で, へ, と, の, も) into the right holes, against the clock.
3. **How it works:** short sentences (5–9 tokens) with 1–3 particle blanks. The player taps a blank and then a particle (or drags it). Valid alternative answers (に/へ with movement verbs) are accepted. Feedback is not a long grammar rule: it is a minimal *contrast* (“で = where an action happens · に = destination / point in time”). All sentences are comprehensible (≥ 95% known vocabulary).
4. **Action per round:** read the entire sentence → identify each phrase’s function (location of the action? object? destination?) → choose the particle.
5. **Skill:** recognizing grammatical particle patterns — essential to *understanding* who does what.
6. **Why it helps:** particles are the skeleton of a Japanese sentence; readers who do not process them automatically guess at relationships. Extensive practice with contrastive feedback leads to implicit rule induction (statistical learning), without a grammar lesson. Interleaving easily confused particles (に/で, は/が) is key.
7. **Level:** upper beginner → pre-intermediate.
8. **Example:** 「としょかん＿ ほん＿ よみます。」 → で, を (*I read books at the library.*). 「七時＿ おきます。」 → に. 「バス＿ えき＿ いきます。」 → で, に/へ (*I go to the station by bus.*). 「わたし＿ ねこ＿ すきです。」 → は, が.
9. **Progression:** 1 blank → 3; compound particles (から, まで, より); sentences with kanji; は vs が in contrastive sentence pairs (「ねこは います」 vs 「ねこが います」 in a mini-dialogue context); “explain” mode: after answering correctly, the player chooses the matching translation (a check of actual comprehension).
10. **Data reuse:** `sentences[].tokens` with `pos = particle`; automatically generated blanks; distractors = particles the player confuses (particle confusion matrix).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** high.
14. **Risks:** becoming a school grammar exercise — avoid terminology, maintain the game’s pace, and always use meaningful sentences; do not test subtle は/が distinctions without context (a source of frustration).
