# Design Review — 16. Triads

This file's proposals assess the [translated specification](./SPECIFICATION.md) and the priorities in the [brainstorm](../brainstorm-minijogos-japones.md); they do not replace the original. Design review recommendations remain separate and unapplied.

## Assessment

Already included in the overall MVP, it clearly connects action and objective: bring together form, reading, and meaning. It deserves prototyping priority. Rules for validity and ending are missing, leaving ambiguity and boards without a solution. The reference to SET describes searching for combinations; teach only the actual matching rule. The interaction provides recognition evidence without proving production of the reading.

## Strengths and gaps

Combining two associations in a move is more informative than recognizing a single translation. Similar readings and meanings can make the choice relevant, provided there is a well-defined word as the anchor.

Isolated kanji admit multiple readings. The example allows 山–さん and 山–やま but does not define what happens to the remaining tile or why one reading deserves a bonus. Duplicate readings, synonyms, and different senses require validating relationships, not tiles' internal identities. An incorrect triple also does not reliably reveal its cognitive cause: the game can point out relationships that do not match, but cannot assert "visual confusion" solely from the selection. A continuous flow with orphan tiles needs to guarantee possible triples after every removal. The fixed 90-second duration also conflicts with accuracy before speed for content that is still unstable.

## Priority improvements

1. Start with complete words and one contextualized reading per entry, accepting reviewed variants where they exist. Leave lists of isolated kanji readings for another mode; remove the arbitrary on'yomi bonus.
2. Visually distinguish the tiles' three roles and allow the selection to be undone before confirmation. Feedback shows word–reading and word–meaning separately, recording only what was observed.
3. Guarantee at least one valid triple in every state and controlled replenishment. A small number of distractors is enough; orphan tiles do not need to be the main mechanism against elimination.

## Recommended MVP

A board of nine to twelve tiles, with three or four familiar words, in a session of six correct triples. Touch selects each tile; Tab/arrow keys and Enter perform the same action, with a confirmation button. There is no two-second lock or initial timer. A round ends when a triple is confirmed; on an error, the selection remains editable and feedback highlights the incompatible relationship. Help reveals one association, recording assistance. After a correct answer, show a brief sentence and the reading before replenishment. The session ends upon reaching six triples or exiting. A short typed-reading check, in a separate round, can assess production without confusing it with matching.

## Defer

Timed flow, fifteen tiles, a fourth facet through sentences, complex Japanese glosses, and bonuses for alternative readings.

## Validation criteria

- Every accepted combination corresponds to documented relationships; homophones and variants do not cause improper rejection.
- After any removal/replenishment, at least one accessible valid triple exists.
- Evidence distinguishes recognition, assisted responses, and any typed production.
- Observe reading and meaning in another format to check whether correct board answers transfer beyond tile positions.
