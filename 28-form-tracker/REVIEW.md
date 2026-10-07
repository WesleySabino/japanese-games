# Review — 28. Form Tracker

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The proposal identifies a specific problem: recognizing the dictionary form does not guarantee understanding the form found in a sentence. Switches make the analysis visible without lengthy typing. Context and meaning checks are strengths. Classifying implementation as low complexity assumes correct annotations; a morphological analyzer alone does not resolve this.

The catalogue combines semantic functions, register, linking forms, and compound forms in the same panel. If all controls are independent, the player can build combinations the content cannot interpret. There is also a risk of learning the NEG/PAST labels more than the sentence’s meaning.

## Specific issues and priority improvements

- **A small panel per round.** Show only the dimensions needed for the set being practiced. Start with affirmative/negative and present/past in curated sentences; English labels come with a short description, rather than a permanent panel of ten functions.
- **Editorial annotation.** Each item needs a lemma, accepted analyses, reading, target segment, and an explanation of meaning in that context. Ambiguities mentioned in the brainstorm itself cannot be resolved with an isolated suffix or a universal rule; when context does not support a single analysis, accept approved interpretations or remove the round.
- **Two separate pieces of evidence.** Identifying the lemma and interpreting the form are different operations. Do not automatically record an error in the base vocabulary when only the switch is wrong. Looking up the lemma also does not invalidate all subsequent comprehension.

## Recommended MVP

One short sentence with the target form highlighted and three known lemmas available. The player chooses the lemma, adjusts two semantic controls, and confirms; touch and keyboard use accessible buttons and controls with Tab/Enter. The round ends with confirmation and a brief meaning check using a curated contrast. A proposed session has six untimed sentences.

Feedback highlights the relevant segment, shows the accepted analysis, and reveals the sentence’s English gloss. Reading and meaning help are available before answering, with the lookup recorded; the player can correct the attempt without erasing the first result. Do not require letter-by-letter segmentation or production of the conjugation: that would expand the original reading scope. The explanation should clarify the sentence presented rather than open a complete table.

## What to defer and how to validate

Defer passive/causative, linked auxiliaries, adjectives, and universal panels. A single set of forms allows testing whether the controls help before expanding content.

1. Every round has reviewed analysis and meaning; ambiguous items have accepted alternatives or additional context.
2. Participants interpret a new sentence without having to repeat the names of the switches aloud.
3. Lemma, interpretation, and operational errors appear separately in the records.
4. The same actions can be completed by touch and keyboard, with accessible lookups and corrections.
