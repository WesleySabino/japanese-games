# Review — 31. Text Explorer

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The task approaches real reading: locate information and show where it is. Clickable tokens and short missions fit in the DOM. Its place on the roadmap after the MVP is consistent with dependence on texts, tokenization, and reviewed questions. It is ready for locating evidence, but the three mission types do not need to debut together.

Lookups inform future reviews. A rigid lantern budget can make help unavailable in a poorly selected text or encourage hiding difficulties. The general principle of lookups without punishment favors a gentler approach in the MVP.

## Specific issues and priority improvements

- **Help always accessible.** Make lanterns an indicator of the number of lookups, not a lockout after three or five. An optional goal of fewer lookups can be tested later, provided it does not prevent continued learning. Record looked-up words without concluding that every lookup proves lack of knowledge.
- **An explicit response unit.** “All foods” may involve repeated occurrences, compounds, or debatable editorial categories. Each mission should say whether it asks for all occurrences or distinct items, with curated accepted spans. Starting with whole-sentence selection avoids touch precision and token-boundary problems.
- **Mission and comprehension separated.** Finding forms with a particular ending may be possible without understanding the text. Prioritize a factual question requiring evidence and keep grammatical categorization as a different task. Lexical coverage does not replace checking grammatical complexity and the available answer.

## Recommended MVP

One short text, approximately 80–150 characters as a proposed scope limit, and two locating missions. Every sentence remains visible; tapping selects a sentence and a confirm button submits the answer. On a keyboard, Tab/Enter navigate the same controls. For word lookups, open an explicit “look up” mode, avoiding conflict between selection and long press; the keyboard uses the same mode.

Each mission ends with confirmation and feedback; the session ends after the two missions for one text. Show the correct evidence and its relationship to the question, allowing rereading. Lookups present a reading/English gloss, and furigana follows the learner’s available support. Selected evidence, help, and independent answers remain separate. Getting a mission wrong does not declare every word within it unknown.

## What to defer and how to validate

Defer long texts, open-ended inferences, selection of dozens of tokens, automatic question generation, and a mandatory lookup budget. A functional reader with two missions already tests the main value.

1. Every accepted answer points to information that actually supports the question.
2. Selection and lookups work without conflict with touch and keyboard, including for small words.
3. The player can look up any word and finish the session after exceeding the lookup goal.
4. Comprehension is maintained in a new text of similar difficulty without relying on the evidence’s fixed position.
