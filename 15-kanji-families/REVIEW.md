# Design Review — 15. Kanji Families

This assessment proposes refinements to the [translated specification](./SPECIFICATION.md), keeping the [brainstorm](../brainstorm-minijogos-japones.md) content separate. Design review recommendations remain unapplied.

## Assessment

Sorting has a simple interaction and an easily bounded scope. It belongs among the lighter implementations if it starts with recognizing visible components. The specification mixes this task with semantic inference and phonetic prediction, which need different data and rules. Before implementation, define what makes a kanji a member of each family.

## Strengths and gaps

A few homes, one item at a time, and contrastive feedback support a short rule. Comparing confusable components may support form discrimination. An example word connects the sorting task to actual reading.

A kanji can contain more than one component shown in the homes. In that case, "the correct home" is not necessarily unique. Sharing a visual form also does not imply that it has the same role in every character. The message "all relate to water" needs to reflect an editorially reviewed family, without inferring meaning merely from the presence of a piece. In phonetic mode, sharing a component does not make all readings identical; showing a word with one reading and announcing another general reading can confuse the player. The "intruder" variant changes the membership criterion: an item can belong visually and be a reading exception. These two questions need to appear separately.

## Priority improvements

1. State the criterion at the outset: "find this visible component" in the MVP. Select sets without overlap between homes or accept every home satisfying the rule. A "none of these" option avoids forcing associations.
2. Highlight the component within the kanji after the answer. Then display a familiar word, without automatically inferring its meaning from the family.
3. Reserve phonetic families for a separate mode, with reviewed words and readings. The rule becomes a clue with explicit exceptions; the answer is not inferred solely from the component.

## Recommended MVP

Two or three homes with clearly visible components and eight kanji per session. The player taps the item and the home, or uses Tab/arrow keys and Enter; there is no need to drag or follow a conveyor. A round ends after sorting or consulting the answer. On an error, the game shows the relevant region and allows another attempt, distinguishing the first attempt from the assisted correction. Help highlights the component; feedback presents a word, reading, and English gloss. Initially there is no timer. The session ends after eight items or a voluntary exit. The result measures component recognition; it does not assume mastery of reading or knowledge of the whole kanji's meaning.

## Defer

Free grouping, homes that are both semantic and phonetic, predicting readings of new kanji, and intruders based on sound exceptions. These modes expand curation.

## Validation criteria

- Every item's answer follows the displayed criterion, with overlap handled.
- Feedback highlights the same form that defines the family, including in fonts available to the project.
- Phonetic exceptions, when introduced, do not appear as errors of visual membership.
- On kanji different from those practiced, check component recognition without recording that result as learned reading or meaning.
