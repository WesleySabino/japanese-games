# Review — 32. Reading Runner

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The proposal has a clear goal: follow a reading pace and verify comprehension. Keeping the full text visible in guided mode supports simplicity and usability. Its place after the MVP is appropriate because it depends on easy texts and reliable questions. It is ready for a guided prototype; two modes and automatic progression can wait.

The brainstorm’s CPM figures and claims about fluency techniques should be treated as references within that document, not universal targets or validated evidence in this project. Imposed pacing, actual time spent, and comprehension are different variables. Counting a sweep of the highlight does not demonstrate that the text was read at that pace.

## Specific issues and priority improvements

- **Comprehension with sufficient resolution.** With three questions, the 80% threshold requires all three correct: two correct answers represent approximately 67%. A difficulty increase based on a single test this small would be unstable. Use results from more than one text to decide a change, keeping the first prototype’s speed adjustable by the player.
- **One variable at a time.** Do not increase CPM, text length, kanji, and removal of furigana simultaneously. Comparing paces while keeping content and support similar avoids attributing a change in lexical difficulty to “speed.”
- **Explicit pause and regression.** Offer pause, move back one chunk, and finish at the player’s own pace. These events are recorded to describe assisted reading, without penalty. Highlighting needs to respect curated chunks and punctuation, not slice by an arbitrary number of characters.

## Recommended MVP

Guided mode only, with a short, easy text and chunk highlighting. The player chooses a comfortable pace, starts, and can pause; buttons work through touch and Tab/Enter, with Space as a pause shortcut when focus permits. The passage ends on reaching the end, but the round ends only after three curated comprehension questions. A proposed session contains two texts.

Before starting, reading/English gloss help on demand allows preparation for difficult words; during reading, lookups and pauses remain available. Feedback shows the evidence for the answers and allows rereading the whole text. Display chosen pace, actual time, and comprehension in separate fields, without turning the highlight’s speed into an automatic record. Rereading the same text receives its own label and is not compared directly with a first reading of a new text.

## What to defer and how to validate

Defer RSVP, automatic speed, rankings, automatic removal of help, and claims to measure fluency through a single passage. The first test should confirm comfort and comprehension.

1. Text and highlighting remain legible, with pause and return working through touch and keyboard.
2. Every question has evidence in the text and does not require external knowledge.
3. Pace, actual time, lookups, and correct answers are distinguishable in the results.
4. An increased pace is proposed only after consistent comprehension in comparable new texts, with other variables held stable.
