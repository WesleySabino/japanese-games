# Review — 29. Context Detective

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

Opening clues and formulating a hypothesis has its own identity within a small interface. Final confirmation and subsequent review are good safeguards. Inclusion in the MVP is defensible with manually curated cases. The challenge lies in content: high lexical coverage does not guarantee an informative clue.

The catalogue’s strong claims about vocabulary acquisition do not need to support the prototype. The hypothesis to test: gradual clues help build and retrieve a word’s meaning in another context.

## Specific issues and priority improvements

- **Informative clue versus introduction.** In both examples, the first sentence does not contain the target. It can prepare the case, but should not automatically count as exposure to the word or demand a guess that is actually possible. Separating the introduction from clues presenting the target makes scoring fairer.
- **Accuracy without rewarding guessing.** Three stars for an early correct answer can encourage random attempts. Offer “I still need another clue” without penalty and record clues used as information, without making haste a learning measure. Limiting guesses per clue reduces trial by elimination.
- **Explicit semantic acceptance.** Define the target sense, accepted English synonyms, close answers, and explanations per case. Normalizing case and spaces is inexpensive; automatically inferring whether arbitrary free text is correct is another project. Inflected forms should be linked to the lemma while preserving the sense presented in the case.

## Recommended MVP

One new word, two or three reviewed clues, and a short English answer with a curated acceptance list. A small option set can serve as assisted help, respecting the overall multiple-choice limit. Reveal-clue, help, and confirm buttons work with touch and keyboard; the answer field accepts Enter.

The round ends on a correct answer or when the solution is revealed after the clues. A proposed session contains four cases, without a timer. At the end, show the target meaning, its reading, and the segment supporting the interpretation, including a new short sentence for confirmation. Lookups of other words remain available and are recorded separately. The target enters review as a newly presented item, not mastered through inference; do not impose “24 hours” as a pedagogical guarantee without the Scheduler’s criterion.

## What to defer and how to validate

Defer automatic corpus collection, multiple targets, abstract definitions, and distinguishing close synonyms. A small, carefully reviewed set is more valuable for the first test than thousands of uninformative cases.

1. Reviewers identify the intended sense from the clues and record plausible alternatives.
2. Accepted synonyms pass; close answers receive clarification, without arbitrary rejection.
3. The player recognizes the target in a new sentence after the case, separately from the initial correct answer.
4. Requesting more clues or help does not end the game or hide the solution, and lookups remain distinguishable from independent answers.
