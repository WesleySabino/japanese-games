# Design Review — 17. On/Kun Switch

This assessment contains proposals about the [translated specification](./SPECIFICATION.md), with reference to the [brainstorm](../brainstorm-minijogos-japones.md) principles. Design review recommendations remain separate and unapplied.

## Assessment

The objective is clear: read a word and produce its reading in kana. It belongs among priorities after the MVP, as the brainstorm suggests. Its strength is shifting the task from a list of kanji readings to real words. Before implementation, resolve ambiguous words and prevent on/kun heuristics from being presented as an infallible algorithm.

## Strengths and gaps

Using the same kanji in different words highlights that reading depends on the word. The gloss after the answer maintains a connection with meaning, and production allows kana omissions and substitutions to be observed.

The sequence "observe structure, decide on/kun, produce" may add a classification that is unnecessary for reading. A whole word can also behave in ways that do not fit a single binary choice. The proposed heuristics already acknowledge exceptions, but need to be shown as clues with limited scope. Without a sentence or sense, some spellings have more than one valid reading; silently choosing the bank's reading would unfairly mark the player wrong. A long series with the same kanji may also make answers easier to anticipate. Finally, there is no rule for input differences, accepted alternative readings, or the end of the session.

## Priority improvements

1. Ask only for the complete word's reading in the MVP. On/kun explanations appear in feedback when useful and verified, without requiring a prior classification button.
2. Curate entries with reading, sense, and accepted variants. For ambiguous spellings, provide a short sentence or enough context; avoid choosing a reading merely because it is the first in the record.
3. Alternate small groups of words sharing a kanji with other review items. Show useful contrasts in the summary without turning the entire session into a predictable list.

## Recommended MVP

A session of eight frequent words already introduced to the learner, covering two or three kanji. The word appears in a simple sentence when context is necessary; the player types the complete reading using a virtual kana keyboard or IME and confirms with a button/Enter. Incidental spaces are normalized without erasing meaningful kana differences. A round ends with a correct confirmation or an answer lookup; an incorrect attempt shows the correct reading and allows an assisted correction. Help can reveal part of the reading. Feedback includes word, reading, English gloss, and, when appropriate, a contrast with another studied word. There is no timer. The session ends after eight items or a voluntary exit, with independent and assisted attempts recorded separately.

## Defer

Kanji with many readings, rare words to complete lists, mandatory exception classification, and automatic rendaku analysis. The reviewed bank is enough initially.

## Validation criteria

- Every question with multiple readings has disambiguating context or accepts the relevant variants.
- The interface allows the same answer through touch and IME, preserving orthographic contrasts.
- No feedback turns "usually" into a universal on/kun rule.
- Observe readings of the words in new sentences and a different order, separating real retention from anticipation of the sequence.
