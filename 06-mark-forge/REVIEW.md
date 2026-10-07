# Review — 06. Mark Forge

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations are design proposals; pairs and explanations need editorial review before use.

## Assessment

Transforming one known word into another makes the orthographic change relevant to the round's goal. This is a good proposal for a short puzzle with few tiles and contrastive feedback. Readiness is partial: the central concept is simple, but the operation list and examples do not yet describe the same rule. Resolving this reduces cost more than implementing automatic pair generation.

## Concrete issues

"One diacritic operation" includes examples of different kinds. The pair おばさん/おばあさん requires inserting a vowel that is absent from the listed tools; びよういん/びょういん requires replacing よ with its small form, while the general description discusses adding marks. The interface needs to define insertion, removal, and substitution as distinct actions.

Presence in the database does not guarantee a suitable pair. Rare words, inflected forms, homographs, or unfamiliar meanings may turn the challenge into guesswork. Treating the rare form as "only for this game" still adds content load. The target gloss must also be checked to ensure it identifies a single item in the pair.

The diacritic theme of Mark Forge can remain, but the tutorial should explain the actual operations without suggesting that every phenomenon works the same way. An automatic edit-distance comparison is insufficient to teach the difference.

## Priority improvements

1. Launch with just one initial operation, such as adding or removing an allowed mark at a validated position. Expand the set in short modules.
2. Use a small list of reviewed pairs, with both words already introduced to the player. This makes the experience predictable and tests the mechanic before the generator.
3. Show the base meaning and target, and highlight only the change after the answer. The hypothesis is to reduce instruction confusion without giving away the position beforehand.

## Recommended MVP

The screen shows the base word, its gloss, and the target gloss, alongside one tool. Select tool and position with touch; on the keyboard, arrows choose the position and Enter applies. One button undoes and another confirms. Do not require dragging or precision to hit a small mark.

On confirmation, a correct answer presents the complete pair with the difference highlighted; an error preserves the attempt, explains the expected operation, and allows correction. Help indicates the position, marking the response as assisted. A round ends after correct confirmation or reveal; five pairs end the session. Results separate incorrect position, incorrect operation, and lookup.

## Defer

Edit-distance generator, multiple transformations, timer, binary detection, rare pairs, and all phenomena at once.

## Validation criteria

- Each pair can be solved using only the provided tool.
- Both glosses are understandable and distinguish the items.
- The person can undo a change without restarting the round.
- Error feedback and help show the visual difference without relying solely on color or romaji.
