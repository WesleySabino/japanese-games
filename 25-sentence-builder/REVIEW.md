# Review — 25. Sentence Builder

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

Building chunks is a good bridge between recognizing and typing a sentence. The interface is small and the content can be shared with reading games. Its position on the roadmap after the MVP is appropriate. The specification supports a limited prototype; the promise to accept any grammatically valid order exceeds the simple validator described.

Keeping content and particle in the same chunk is a strength: it reduces operations and lets players think about the segment’s function. However, finding the verb chunk and placing it at the end may solve a round without understanding the target. An emoji scene can also leave relationships and tenses too implicit to serve as an unambiguous answer key.

## Specific issues and priority improvements

- **Limited editorial answer keys.** For each sentence, explicitly record accepted constructions that preserve the target’s meaning. The rules “verb at the end” and “modifier before the modified element” cannot validate every construction. For the MVP, removing a disputed item is simpler than implementing a general grammar analyzer.
- **Consistent distractors.** The catalogue presents 「こうえんを」 as a distractor in one round and later uses 「公園を 走って います」 in a paraphrase. This requires editorial review: a rejected chunk should be unsuitable for the requested context and meaning, rather than merely different from the model sentence.
- **Visible comprehension.** In some rounds, add a short question about the agent, action, or object after construction. Use a curated meaning contrast, avoiding scoring based solely on recognizing endings.

## Recommended MVP

Three or four chunks, initially without a distractor, with an English gloss and reading help on demand. Tapping chunks adds them to the sequence; tapping again removes them. Move-left/right buttons allow corrections without dragging. Tab, Enter, and the same button actions support keyboard input.

The player confirms the construction whenever ready. The round ends after confirmation and feedback; a proposed session contains six sentences. A valid answer receives confirmation of its meaning even when it differs from the model order. A rejected answer highlights a relevant segment and offers an accepted construction with a short explanation, without reorganizing everything before the attempt. Lookups and corrections count as assisted responses, not independent mastery. Measure construction and comprehension separately when the additional question appears.

## What to defer and how to validate

Defer timing, seven chunks, relative clauses, complex paraphrases, automatic bunsetsu generation, and a universal validator. Starting with curated chunks reduces technical work and makes the design test interpretable.

1. All recorded accepted orders pass; constructions that change meaning receive specific feedback.
2. Participants correct the sequence with touch and keyboard without depending on drag-and-drop.
3. A correct construction is accompanied by comprehension of a new contrast, and the two measures remain separate.
4. No distractor is rejected merely for differing from the answer key: its reason is recorded in the reviewed content.
