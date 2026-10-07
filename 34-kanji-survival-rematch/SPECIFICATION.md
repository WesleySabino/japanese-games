# 34 — Kanji Survival + Rematch

**Catalogue ID:** 34.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 34.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 34. Kanji Survival + Rematch

1. **Name:** Kanji Survival + Rematch, featuring the weekly boss **Rematch**
2. **Concept:** an endless mode serves the day’s review queue in mixed formats; with 3 lives, the player survives as long as possible. Every week, a “Rematch” boss is built from the player’s errors over the last 7 days.
3. **How it works:** each question is drawn from formats compatible with the item and the facet being reviewed (type a reading, choose a meaning among distractors from the confusion graph, sentence ○✕, complete a particle, segment). Correct answers on difficult items restore half a life; response time is recorded. Rematch displays the “crime history” (incorrect items and what they were confused with) and tackles each in a format different from the original error.
4. **Action per round:** quickly answer due items in an unpredictable format.
5. **Skill:** long-term retention of everything learned; generalization across formats.
6. **Why it helps:** a direct embodiment of spaced repetition with varied retrieval (the same item in different formats avoids “format-dependent” learning). Rematch uses the *hypercorrection effect* and reinforces that making mistakes is part of the game, not failure.
7. **Level:** all (from phase 1).
8. **Example:** sequence: (1) 「駅」 → type the reading: えき ✓ · (2) 「待つ」 → *wait* / *hold* / *buy* / *walk* → *wait* ✓ · (3) 「きのう えいがを みませんでした。」 + 🎬✅ → ✕ ✓ · (4) Rematch: on day 3 the player read 持つ as まつ; now 「荷物を 持って ください。」 appears → type the reading of 持って: もって ✓ → “Rematch won! 持 (hold) ≠ 待 (wait)”.
9. **Progression:** difficulty is the queue itself; over time, more production formats and fewer recognition formats; adaptive pacing.
10. **Data reuse:** 100% Scheduler + `errorLog`.
11. **Complexity:** low (reuses round renderers from the other games).
12. **Cost:** minimal.
13. **Replayability:** high (the “daily mode”).
14. **Risks:** feeling like a “test” — maintain a quick pace, positive feedback, and short sessions (the player can stop at any time without a lost-life penalty). Do not turn Rematch into humiliation: positive language (“You beat 9 of your 11 old mistakes”).
