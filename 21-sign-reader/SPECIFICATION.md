# 21 — Sign Reader

**Catalogue ID:** 21.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 21.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 21. Sign Reader

1. **Name:** Sign Reader.
2. **Concept:** the player is in a simulated Japanese station, shop, or street and needs to *act* by reading signs: find the north exit, avoid entering a prohibited area, determine whether the shop is open.
3. **How it works:** simple HTML/CSS scenes (text-filled rectangles imitating signs, Unicode arrows). Each scene gives a mission in English (later in Japanese), and the player taps the correct sign/door. Points for speed; errors have light narrative consequences ("You walked into the staff-only area!").
4. **Action per round:** read the mission → scan signs → recognize functional kanji → act.
5. **Skill:** rapid recognition of real-world functional kanji and words (*realia*), *scanning* for information.
6. **Why it helps:** authentic tasks increase motivation and transfer; reading to act (rather than translate) forces direct comprehension. Sign kanji have extremely high visual frequency in Japan and are very motivating for prospective travelers.
7. **Level:** advanced beginner (phase 4–5).
8. **Example:** "Station" scene: signs 北口 · 南口 · 改札 · 出口 · 入口 · きっぷうりば · 関係者以外立入禁止. Mission: "Exit on the north side" → 北口 (きたぐち). Mission: "Is the café open?" Door sign: 準備中 → *No* (preparing). Other signs: 営業中 (*open*), 本日休業 (*closed today*), 押 (*push*) / 引 (*pull*), 禁煙 (*no smoking*), 非常口 (*emergency exit*), 止まれ (*stop*).
9. **Progression:** missions in Japanese (「きたぐちから でてください」); scenes with more signs; compound signs; timer; themed scenes (hospital: 受付, 待合室; supermarket: 半額, 税込).
10. **Data reuse:** `words[]` with the `realia` tag, `scenes[]` (JSON with sign positions).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium (randomized scenes and missions).
14. **Risks:** disproportionate growth of "tourist" vocabulary—limit to ~80–120 highly useful signs; cover readings as well as recognition.
