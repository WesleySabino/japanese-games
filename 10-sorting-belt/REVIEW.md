# Review — 10. Sorting Belt

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The improvements are design proposals; correct classification alone does not prove comprehension without mental translation.

## Assessment

Classifying words by meaning offers a clear action and can use the same vocabulary with different themes. It is a good MVP candidate if the belt starts with a few concrete categories. The uncertainty box and acceptance of multiple categories are strengths. The proposal needs to turn these ideas into response rules and separate word knowledge from operational speed.

## Concrete issues

The three-second limit conflicts with the overall priority of accuracy before speed, especially if new labels must also be read. It is unspecified whether a word reaching the end records a semantic error, a timeout, or merely a loss on the belt.

Database tags do not automatically represent every sense of a word. "Animal" and "food" may overlap; categories such as "moves" depend on context and the stated criterion. Accepting both resolves some cases but requires mapping valid answers per round. The "both!" bonus also needs to define whether the person must choose two boxes or whether either one is sufficient.

Dragging, swiping, and arrows are distinct interactions and can cause unintended submissions. A wrong gesture does not demonstrate a meaning error. Choosing a box remains a choice among options, so its classification needs to respect the overall format policy. The text cannot guarantee that the player stopped translating just because they did not write English.

## Priority improvements

1. Use two concrete categories and a small reviewed set, with all relevant senses explicit in the data.
2. Allow direct tapping on the box or its corresponding key; dragging remains optional. Slow animation can convey the theme without imposing a deadline.
3. Treat "don't know", lookup, and expiration separately from incorrect categorization. The hypothesis is to encourage honest help use and preserve evidence quality.

## Recommended MVP

One visible word at a time, two previously taught Japanese boxes, and an uncertainty option. The player taps the box or uses numbered keys; Enter confirms the selection if needed. Label glosses can be looked up without losing points.

Any valid category accepts the word. Feedback shows the word, category, and a brief gloss; errors explain why the option does not apply to the round's sense and offer assisted correction. "Don't know" reveals the information and moves on. The round ends on a response or reveal; ten words end the session. The summary separates independent classifications, errors, uncertainty responses, and lookups. The belt pauses during help and does not eliminate words in the first prototype.

## Defer

Four boxes, mandatory swiping, multiple words, abstract categories, formality, on/kun, and adaptive speed.

## Validation criteria

- Every word has at least one valid category for the presented sense.
- Cases with two valid answers accept either one.
- Uncertainty and lookup do not appear as semantic errors.
- Touch and keyboard complete classification without depending on animation.
