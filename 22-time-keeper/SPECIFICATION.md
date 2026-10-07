# 22 — Time Keeper

**Catalogue ID:** 22.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 22.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 22. Time Keeper

1. **Name:** Time Keeper.
2. **Concept:** a character's schedule arrives written in Japanese; the player drags appointments to the correct day and time on a calendar and a clock.
3. **How it works:** a monthly calendar and a clock (CSS). Each "message" contains a date/time in Japanese (「四月八日（月）午後三時半」). The player positions the event. Separate "reading" mode: type the reading (よっか, ようか...), because Japanese dates have many irregular readings. "Lightning" mode: a time appears, and the player adjusts the hands in 4 s.
4. **Action per round:** decode numbers in kanji, counters (月, 日, 時, 分), and markers (午前/午後, 半) → act on the calendar.
5. **Skill:** numbers in kanji, dates, times, days of the week, irregular readings (ついたち, ふつか, はつか; よじ, くじ, しちじ; じゅっぷん).
6. **Why it helps:** numbers and dates appear in practically every real text; mapping them to an action (positioning) demonstrates comprehension without translation. Reading mode isolates the irregularities through focused spaced repetition.
7. **Level:** beginner (numbers in Arabic numerals + kana) → advanced beginner (kanji).
8. **Example:** 「十月二十日（火）午前九時」 → drag to 20 October (20/10), Tuesday, 9 a.m. Reading: 二十日 = はつか, 九時 = くじ. 「三月一日 午後四時十分」 → 1 March (1/3), 16:10; readings ついたち, よじ, じゅっぷん.
9. **Progression:** Arabic numerals → kanji; whole hours → minutes; days of the week (月火水木金土日—also excellent first kanji); relative expressions (来週の火曜日, 三日後).
10. **Data reuse:** procedural generator (random dates) + `words[]` for irregular readings (each irregular reading is a tracked item).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium (unlimited procedural generation, but a narrow theme).
14. **Risks:** the player reads the numerals and ignores everything else—use kanji as soon as possible and include relative expressions requiring comprehension.
