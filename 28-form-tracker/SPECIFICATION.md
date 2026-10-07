# 28 — Form Tracker

**Catalogue ID:** 28.
**Status:** proposal; not implemented yet.
**Source:** [original brainstorm](../brainstorm-minijogos-japones.md), section 1, game 28.

The following 14 fields are an English translation of the original catalogue entry in full, including examples, risks, and caveats. Recommendations are kept separately in [REVIEW.md](./REVIEW.md) and have not yet been applied to the game.

This specification also depends on the brainstorm’s guidelines: section 0 (principles), section 2 (curriculum), section 3 (learner model), section 5.2 (interface and data), and sections 5.4–5.7 (variation, scaffolding, errors, and progression). The [project index](../README.md) records the proposed shared implementation decisions.

## Original catalogue content (English translation)

### 28. Form Tracker

1. **Name:** Form Tracker
2. **Concept:** the player “takes apart” conjugated verbs and adjectives found in sentences, turning on meaning switches (NEG, PAST, WANT, CAN, -TE, POLITE...) until the interpretation matches.
3. **How it works:** a sentence with a highlighted verb form. Panel: “dictionary form” field (choose among 3 options or type) + function switches. The player adjusts the switches and confirms; the game shows the sentence translation *only afterward*. No conjugation tables: the focus is recognition (reading), not production.
4. **Action per round:** isolate the stem → identify the dictionary form → decode each meaning suffix.
5. **Skill:** recognizing verbal/adjectival morphology — crucial for reading, because the meaning of the sentence changes at the final suffix.
6. **Why it helps:** pre-intermediate readers “know” 食べる but do not recognize 食べさせられなかった; treating conjugation as a stack of switches teaches compositionality (morphological chunking). Anchoring it in real sentences avoids a school-style table format.
7. **Level:** pre-intermediate → intermediate.
8. **Example:** 「きのうは なにも 食べなかった。」 → 食べる + NEG + PAST → *didn't eat*. 「今日は 飲みたくない。」 → 飲む + WANT + NEG → *don't want to drink*. 「この 漢字が 読めますか。」 → 読む + CAN + POLITE (+ question) → *Can you read this kanji?* Teaching ambiguity: 「先生に 見られた。」 → 見る + PASSIVE + PAST (*was seen by the teacher*); 「られる」 can also be potential — context (に + agent) determines the interpretation.
9. **Progression:** ます/ません/ました → て/た form → ない/たい → potential → passive/causative → combinations; adjectives (高くなかった); auxiliaries (〜てしまった, 〜ている, 〜ておく).
10. **Data reuse:** `sentences[].tokens` with `lemma` and `inflection[]` (provided by the morphological analyzer during offline preparation).
11. **Complexity:** low.
12. **Cost:** minimal.
13. **Replayability:** medium.
14. **Risks:** turning into a grammar lesson — keep switches labeled with simple meanings, never terms such as “renyōkei”; ensure that the sentence is understood (a final meaning check).
