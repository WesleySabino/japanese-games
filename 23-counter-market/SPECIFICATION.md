# 23 — Counter Market

**Catalogue ID:** 23.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 23.
**Translation:** English translation of the original catalogue.

All 14 fields below are translated in full from the catalogue, including examples, risks, and any caveats. Design review recommendations remain separate in [REVIEW.md](./REVIEW.md) and have not been applied to the game.

This specification also depends on the brainstorm guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Translated catalogue content

### 23. Counter Market

1. **Name:** Counter Market.
2. **Concept:** the player is a shopkeeper: they read order lists using Japanese counters and assemble baskets with the correct objects and quantities.
3. **How it works:** a written order (「えんぴつを 三本と きってを 五枚 ください。」). The player drags emojis/objects into the basket and sets the quantity. The counter indicates a shape category (本 long and thin; 枚 flat; 匹 small animal; 冊 book; 台 machine; 個 small object; 人 person; つ generic). Reverse mode: the player sees a basket, chooses/assembles the counter, and reads the quantity (いっぽん, さんぼん, ろっぽん—sound changes).
4. **Action per round:** read the order → decode number + counter → infer the object type when the noun is unknown (the counter is a clue!) → assemble.
5. **Skill:** counters, numbers, sound changes (rendaku/sokuon), reading orders with を/と/ください.
6. **Why it helps:** counters are a classic difficulty, and the "shop" format gives them a functional use. Inference mode (counter as a category clue) trains strategic reading.
7. **Level:** advanced beginner.
8. **Example:** 「ねこを 二匹、かさを 一本、本を 三冊 ください。」 → 🐈×2, ☂️×1, 📕×3. Readings: 二匹 にひき, 一本 いっぽん, 三冊 さんさつ. Trap: 本 (*book*) vs 〜本 (counter for long objects) in the same sentence.
9. **Progression:** basic counters → sound changes (一匹 いっぴき, 三匹 さんびき, 六匹 ろっぴき) → long orders → less common counters (杯, 足, 軒) → descriptions where only the counter reveals the object.
10. **Data reuse:** `counters[]` (table of readings by number), `words[].counter` (which counter the noun uses).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium.
14. **Risks:** too many rare counters; teaching "1 counter per object" when variation exists (e.g., うさぎ with 羽 is traditional, 匹 is common)—accept common variants.
