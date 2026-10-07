# Review — 27. Follow the Directions

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

“Reading is acting” is a verifiable goal: execute an instruction without translation. The grid and landmarks allow a small prototype. The proposal recognizes limited vocabulary as a risk. It is ready for a one-step version, but movement must be defined to distinguish reading difficulty from navigation difficulty.

Step-by-step recording is better than assessing only the destination. Accidentally reaching the final cell does not prove understanding of the entire instruction. Conversely, making the text disappear introduces working memory and changes what is being measured; it should stay out of the first procedural-comprehension test.

## Specific issues and priority improvements

- **An explicit frame of reference.** Define whether right and left are relative to the screen or the character’s orientation; show the current direction when relevant. Also define whether “turn” only rotates or already moves the character. An unscored interactive demonstration resolves this ambiguity inexpensively.
- **The route, not just arrival.** Represent each command as a verifiable action and record the first deviation. The system should not conclude that there was lexical confusion when someone merely tapped the wrong cell; allowing undo before confirming the segment helps separate these cases.
- **Safe generation.** A random route does not guarantee an unambiguous description. Use small curated maps, without duplicated landmarks, and check that all actions stay within the grid before expanding the generator.

## Recommended MVP

A 5×5 grid, one character, two or three landmarks, and one visible one-step instruction; later, two linked actions. The player uses advance, turn, and stop buttons, corresponding to keyboard commands shown on screen. The same functions work with touch, without requiring precise gestures on cells.

A round ends when the player confirms “stop” or executes the requested sequence. A proposed session has five routes. Feedback compares the requested segment with the action performed and highlights the corresponding command in the text; it allows retrying with reading or English gloss help available. Do not immediately hide the correct map or treat lookups as losing a life. Record instruction comprehension separately from the number of movements and interface corrections.

## What to defer and how to validate

Defer larger maps, a timer, disappearing text, conditionals, entering shops, and integration into Word Dungeon. Variety can come from initial positions and landmarks without multiplying rules.

1. Participants demonstrate the controls’ meaning without having to interpret a new Japanese instruction.
2. Every generated route has a valid execution and an unambiguous spatial frame of reference.
3. Feedback identifies the first divergent command, including when the final destination happens to coincide.
4. Accuracy on an instruction is maintained when the map and initial position change, indicating that a fixed route was not simply memorized.
