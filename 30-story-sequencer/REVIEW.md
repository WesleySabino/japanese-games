# Review — 30. Story Sequencer

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The sortable list is simple and expands reading to relationships between sentences. The examples offer a starting point. Inclusion among the ten simplest games is consistent for the interface; the editorial work of defining coherence and alternatives remains. It is ready for four cards, provided the answer key is not reduced to the original text’s order.

Accepting plausible orders already appears as an important requirement. Recognizing that a familiar text loses interest is also positive. However, increasing volume by generating recipes and routines may simply repeat structures players solve without reading. Replayability needs new meaning relationships, not merely objects substituted in an identical script.

## Specific issues and priority improvements

- **Editorial alternatives and constraints.** Record accepted orders or, within a small set, the required relationships between cards. The relevant question is whether the sequence is coherent, not whether it matches the model text. Do not try to decide automatically whether any narrative is plausible.
- **Localized feedback.** Immediately rearranging every card gives away the answer. First showing one problematic relationship and highlighting the two supporting segments allows purposeful correction. The first attempt and assisted correction should remain separate.
- **Reading beyond markers.** The recipe example can be solved by finding four connectives. Use it to demonstrate the mechanics, followed by stories with a cause or reference relationship and a meaning question. Abruptly removing every marker would change difficulty without explaining what changed.

## Recommended MVP

Four short cards, fully visible, with known vocabulary and one central relationship per story. Tapping selects a card and “up” and “down” buttons move it; drag-and-drop is optional. Tab, Enter, and the same buttons support keyboard input. Positioning does not validate automatically: the player confirms when satisfied.

The round ends after confirmation and a short comprehension question, answered by selecting the sentence containing the evidence. A proposed session has three stories. Feedback accepts any recorded order, explains one link, and allows rereading the complete version. Reading and English gloss help are available on demand, without making a lookup a defeat. Ordering and comprehension responses generate distinct evidence; a structural success does not automatically declare mastery of every word in the text.

## What to defer and how to validate

Defer seven cards, entire paragraphs, expository texts, a timer, and broad procedural generation. Curated variations of small stories keep implementation understandable.

1. All approved orders are accepted, including alternatives differing from the reference version.
2. Participants can move and correct cards using touch and keyboard without operational help.
3. After ordering, they identify a meaning relationship in a new text without relying solely on enumeration connectives.
4. Each rejected sequence has at least one explainable relationship; items without a clear justification are removed or reviewed.
