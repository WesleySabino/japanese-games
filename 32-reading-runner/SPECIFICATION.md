# 32 — Reading Runner (RSVP / Guided Reading)

**Catalogue ID:** 32.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 32.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 32. Reading Runner (RSVP / Guided Reading)

1. **Name:** Reading Runner
2. **Concept:** a text is revealed chunk by chunk at a controlled pace (like on a treadmill); the player “keeps up” and then demonstrates comprehension. The pace increases with fluency.
3. **How it works:** two modes: (a) *Guided*: the full text stays visible and a highlight moves across chunks (bunsetsu) at the target speed (preserving the more natural possibility of looking back); (b) *RSVP*: chunks appear one at a time in the center (more intense, for short practice). Speed is in characters per minute (CPM), initially ~120–150 CPM; native readers read ~400–600 CPM. After the text: 3 ○✕ or “tap the evidence” questions. If comprehension ≥ 80%, the next run increases speed by ~5–10%; if < 60%, it decreases.
4. **Action per round:** read at an imposed pace, without stopping to translate → answer.
5. **Skill:** reading fluency (speed with comprehension), automatic word recognition.
6. **Why it helps:** fluency develops only by reading *easy* text in volume and with light pacing pressure (research on extensive reading and fluency training, e.g. Nation’s “timed reading”). Texts should contain ~98% known words: the goal is speed, not new vocabulary. CPM becomes a motivating and honest metric.
7. **Level:** pre-intermediate → intermediate (kana version for phase 5).
8. **Example:** text (≈ 90 characters) at 150 CPM (~36 s): 「きのう、ともだちと こうえんへ いきました。てんきが よかったので、ベンチで おべんとうを たべました。そのあと、いけの まわりを さんぽしました。」 Questions: 「てんきは わるかった。」 ✕ · 「ベンチで たべた。」 ○ · 「いけで およいだ。」 ✕.
9. **Progression:** adaptive CPM; longer texts; more kanji; less furigana; RSVP with larger chunks; reread the same text 2–3 times at increasing speed (*repeated reading*, a proven fluency technique).
10. **Data reuse:** `texts[]` and `sentences[]` with character counts; selection by the player’s lexical coverage ≥ 98%.
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium-high (library + CPM record).
14. **Risks:** speed without comprehension — never increase CPM without comprehension ≥ 80%; RSVP prevents regressions and can impair reading of complex texts — use guided mode by default.
