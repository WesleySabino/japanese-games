# 33 — Word Dungeon

**Catalogue ID:** 33.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 33.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 33. Word Dungeon

1. **Name:** Word Dungeon (言葉のダンジョン)
2. **Concept:** a 5–10-minute text-based roguelite in which every room is a reading micro-challenge; enemies are the player’s own confusions and the boss is a short text.
3. **How it works:** a floor map with 5–8 rooms in a graph (path selection, simplified *Slay the Spire* style, entirely in text/emoji). Room types: *combat* (micro-rounds from games 1, 3, 16, 24, 26 — each correct answer deals damage), *locked door* (read an instruction to choose the correct door), *chest* (a riddle like game 13), *shop* (spend coins on items), *rest* (light review). Items: 辞書 (dictionary: reveals a gloss), 巻物 (scroll: furigana for a sentence), お守り (charm: forgives one error), 時計 (clock: +5 s). Enemy names are derived from the player’s actual confusions (“ぬめスライム,” appearing if ぬ/め is an active confusion; “待持ゴースト”). Boss: short text + 3 questions. Death ends the *run*, but every answer has already been recorded in the learner model; meta-progression unlocks **room types and cosmetics**, never power that removes the need for knowledge.
4. **Action per round:** choose a path (risk vs reward: elite room = items the player confuses), solve challenges, manage HP/items.
5. **Skill:** integrating everything (kana, vocabulary, kanji, particles, comprehension), with emphasis on what the Scheduler indicates.
6. **Why it helps:** provides the “why play today” that keeps spaced repetition alive: the run’s content *is* the day’s review queue, wrapped in strategic decisions. Variety of formats within the run is natural interleaving; personifying confusions turns errors into targets (motivation to review difficult material).
7. **Level:** beginner (kana dungeon) → intermediate (text dungeon).
8. **Example:** Floor 2, “locked door” room: 「左の とびらは あぶない。まんなかの とびらは かぎが かかって いる。右へ 行け。」 → the player chooses the right-hand door. Combat room against “シツ Twins”: 6 fast シ/ツ/ソ/ン rounds in words (シャツ, ソファ). Boss: text 「この 森に 住む 竜は、毎晩 月を 見て 歌う。しかし、雨の 夜は 歌わない。」 → 「竜は 雨の 夜に 歌う。」 ✕.
9. **Progression:** deeper floors use more demanding formats (production > recognition); themed dungeons by phase; optional modifiers (no furigana = +50% coins).
10. **Data reuse:** an *orchestrator*: calls other games’ modules through the same `GameModule` interface and requests content from the Scheduler.
11. **Complexity:** medium (the largest game; it reuses the others).
12. **Cost:** low.
13. **Replayability:** very high.
14. **Risks:** the game layer swallowing the learning (time spent in menus/maps) — limit non-linguistic decisions to ≤ 15% of the time; items must not “skip” questions without a pedagogical cost (the dictionary reveals a gloss, but the word is rescheduled as a partial error).
