# Review — 03. Tricky Twins

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations are design proposals, not demonstrated learning outcomes.

## Assessment

The core is ready for a prototype: searching for contrasting forms in a small grid, followed by identification, needs little data. The second stage is the specification's strongest point, connecting the difference found to a reading or meaning. Inclusion among the simplest games holds if the first prototype uses only known kana, one font, and one pair per round.

## Concrete issues

"Find quickly" mixes visual scanning, touch control, and character knowledge. An off-target click does not automatically establish linguistic confusion. Deducting seconds may increase haste without clarifying which skill is missing.

It is unspecified whether the person knows the number of impostors or how to finish a search with zero impostors. Without explicit confirmation, the zero variant becomes unresolved waiting. In the naming stage, revealing readings before the answer would turn retrieval into copying. For kanji, asking for an isolated "sound" also requires specifying which contextual reading would be accepted; that variant needs additional content.

8×8 grids and alternative fonts may make difficulty dependent on the screen. Automatic decomposition does not guarantee that a pair suits the level or has a useful explanation.

## Priority improvements

1. Use a 4×4 grid with a studied pair and one or two impostors. Positions vary, but targets remain comfortably sized.
2. Include "Finish search" and keep selections reversible. This lets the player answer deliberately, including when they believe there is no difference.
3. Separate search results from naming results. The hypothesis to test is that this makes feedback more informative and avoids recording motor slips as reading errors.

## Recommended MVP

Each round presents the pair of forms without readings and asks the player to select the different ones. Touch toggles selection; on the keyboard, arrows move focus, Space selects, and Enter confirms. After the search, the person provides the reading of both kana through the input field with the permitted initial scaffolds or a virtual keyboard. Only then do the correct answer and a short, previously reviewed visual indication of the difference appear.

Search errors are highlighted in the relevant cells; naming errors show the contrast and allow a new assisted attempt. Help enlarges both glyphs side by side and records a lookup. The round ends after both stages; the session ends after five pairs. No timer in the first test.

## Defer

Kanji, multiple fonts, large grids, records, and time penalties. Add zero impostors only after validating the confirmation button.

## Validation criteria

- The person understands when to finish searching without knowing the number of impostors.
- All cells work with touch and keyboard without requiring fine precision.
- A correct search with incorrect naming produces distinct results.
- The same pair is identified in different positions, without revealing its reading before the answer.
