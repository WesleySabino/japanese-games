# Review — 09. Sentence Slicer

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations are design hypotheses; correct segmentation depends on reviewed content.

## Assessment

Inserting cuts is a simple interaction directly related to reading continuous text. The game can span levels without changing its mechanic, supporting its inclusion in the MVP. The interface is inexpensive; the main cost is deciding which cuts are accepted and explaining differences. The specification is promising, but this policy must be settled before using automatic tokenization.

## Concrete issues

The text alternates between "word", "morpheme", and "bunsetsu/word" as though they were one standard. Examples also keep an entire verb form intact, while the token database may split it. Comparing only the analyzer's offsets may reject an answer compatible with the instructions. The mode needs an understandable name and examples that follow its exact rule.

Ambiguous sentences need context or multiple reviewed answers. Automatically accepting every tokenizer output does not guarantee pedagogical suitability either. A small, unambiguous catalogue is more ready than a virtually infinite unreviewed source.

Cuts in a long line require touch precision. Penalizing a displaced boundary without allowing correction mixes reading with operation. Also, recognizing a chunk in context does not necessarily demonstrate knowing the reading and meaning of all its words; "exposure" should remain distinct from a correct lexical response.

## Priority improvements

1. Choose one initial standard: units corresponding to the short examples, with entire verb forms and separate particles. Avoid describing this standard as a different granularity.
2. Store an explicit, manually reviewed list of accepted cut sets per sentence. The analyzer assists content preparation rather than deciding alone.
3. Confirm only at the end and allow any cut to be toggled beforehand. Boundary-level feedback guides correction without requiring a restart.

## Recommended MVP

Five short sentences, with known vocabulary and minimal context when needed. Each gap between characters is an enlarged touch target; on the keyboard, arrows traverse boundaries, Space toggles a cut, and Enter confirms. A visual line break does not create an answer boundary.

After confirmation, highlight valid cuts and explain only the first discrepancy, showing the accepted segmentation. The player corrects or reveals the answer. Help provides one boundary and records a lookup. A round ends with accepted segmentation or reveal; the session ends after five sentences. A brief gloss of the whole appears at the end, without requiring translation of each segment. No time bonus.

## Defer

Morphemes, paragraphs, grammatical categories, deliberately ambiguous sentences, timer, and bulk corpus import.

## Validation criteria

- Each sentence has a rule and at least one reviewed accepted segmentation.
- Anticipated alternative answers receive no penalty.
- Cuts can be inserted and removed with touch and keyboard, including after a line break.
- Results record segmentation in context without automatically assigning mastery to words.
