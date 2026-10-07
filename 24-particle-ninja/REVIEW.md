# Review — 24. Particle Ninja

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The idea has a clear core: complete a relationship in a comprehensible sentence and receive a short contrast. Selecting a blank and a particle is straightforward with touch or a keyboard. Scheduling it after the eight-game MVP is consistent with its dependence on reviewed sentences. It is ready for a limited prototype, but not for generating blanks from any particle token.

Its strength is asking players to read the full sentence rather than make isolated particle-to-definition matches. However, choosing an option does not, on its own, demonstrate understanding of the relationship expressed. The meaning-check mode planned in the progression helps, provided it does not turn every round into two school-style questions.

## Specific issues and priority improvements

- **Context-specific accepted answers.** The text accepts alternatives in some examples but does not define how to represent possible answers. Each blank should have an editorial list of accepted answers and an explanation tied to that sentence. An answer key generated from the original token is insufficient; a sentence may admit another interpretation or intention.
- **Contrast without oversimplification.** Short feedback should explain the use being assessed in that context, avoiding a universal equivalence. Cases involving は/が should appear only with a mini-dialogue or situation supporting the intended distinction.
- **Pressure after comprehension.** The concept starts against the clock, contrary to the general principle of accuracy before speed. Starting without a timer is an inexpensive change; pacing can become optional once performance on the sentence set is stable.

## Recommended MVP

One short sentence, one blank, and a few available particles. The player selects the blank and then a button; on a keyboard, Tab and Enter perform the same action, with optional number shortcuts. The response is recorded only after confirmation, so exploring the interface is not confused with a language error.

A round ends on confirmation; a proposed session contains eight sentences and may end earlier. Feedback shows the completed sentence, highlights the relevant relationship, and allows the player to look up the reading/English gloss, following the brainstorm’s support language. After an error, offer another assisted attempt, recorded separately from the first response. An occasional check asks the player to identify who does what using the elements already read. Record evidence for the particle assessed without declaring every word known as a consequence of a correct answer.

## What to defer and how to validate

Defer animated shurikens, three blanks, subtle distinctions without context, compound particles, and broad automatic generation. The ninja theme can remain in an icon and feedback.

1. All alternative answers approved in the content are accepted, including in keyboard tests.
2. After an error, the player can explain or indicate the highlighted relationship in a different sentence.
3. The first rounds can be completed without dragging or operational help.
4. Timed mode becomes available only after an explicit accuracy criterion across separate sessions, and lookups remain accessible.
