# Review — 26. Flash Scene

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

This is one of the ideas most ready for prototyping: scene, sentence, and binary decision form an understandable loop. Inclusion in the MVP and the simplicity and fun rankings is consistent. Generating scene and sentence from the same data makes checking the answer key easier. Most work remains in the content and the unambiguous presentation of the scene.

The specification mixes initial comprehension, fluency, and advanced inference. These layers should be separated. A static scene does not automatically establish past events, and the example of possibility inferred from a mini-text requires assessing evidence, rather than merely comparing a visible fact. Expanding early into these situations would weaken the binary answer key.

## Specific issues and priority improvements

- **A readable scene on every device.** Emojis vary visually between platforms. Relationships such as under, inside, and beside need explicit containers, areas, and positioning; they should not depend on a drawing’s perspective. Start with identity, quantity, and two clearly rendered spatial relationships.
- **One change per false sentence.** Store the changed attribute and the sentence segment expressing the difference in the content. Feedback can then show the actual contrast, and the error can be classified without guessing its cause.
- **Comprehension before pacing.** Twenty sentences in approximately one minute is an experience proposal, not an initial obligation. Allow unlimited reading time and “I don’t know”; speed alone does not prove guessing, and discounting an overly fast response should remain a hypothesis to test.

## Recommended MVP

One stable scene and eight to ten short sentences per session. Large ○ and ✕ buttons are the main input; labeled keys perform the same action. Swiping can be supplementary, with visual confirmation of direction. Each response ends the round; scene and sentence remain until the player advances in practice mode.

After an error, highlight the relevant attribute and present a correct description. For some false sentences, ask the player to tap the incompatible segment; this check supplements the binary answer. Reading/English gloss help can appear on demand and in feedback, keeping the main screen in Japanese. Assisted decisions receive their own record. The paced version uses already-practiced content and allows pausing without losing previous responses.

## What to defer and how to validate

Defer past tense without a visible temporal sequence, counterfactuals, complex quantifiers, probabilistic inferences, and automatic acceleration. This keeps the generator’s state space small.

1. Each scene and answer key is understood consistently on mobile and desktop, without depending on a particular emoji’s appearance.
2. Every false sentence changes exactly one attribute and has a verifiable explanation.
3. Correct binary answers are accompanied by correct evidence identification in a sample of rounds.
4. Introducing pacing preserves the accuracy observed in practice mode; time, lookups, and accuracy are recorded separately.
