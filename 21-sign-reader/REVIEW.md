# Design Review — 21. Sign Reader

This file assesses the [translated specification](./SPECIFICATION.md) and proposes small adjustments, keeping the [brainstorm](../brainstorm-minijogos-japones.md) intact. Design review recommendations remain separate and unapplied.

## Assessment

The objective is concrete: understand a sign to act. HTML/CSS scenes allow a small version. Prototype after the initial core, defining missions, consequences, and ending. Transfer to real situations needs validation; choosing a simulated door does not demonstrate recognition of the expression in another context.

## Strengths and gaps

Reading to act reduces dependence on answering with a translation. The theme offers immediate meaning for short expressions. Variations in mission and position can reuse the same content without making the screen heavy.

The example mixes different actions: choosing an exit, answering whether a shop is open, and deciding whether to push or pull. Each needs its own rules and controls. Points for speed can also encourage decisions before comprehension. The correct choice can be inferred from an arrow, color, position, or door drawing even without reading; varying only the text does not correct this problem. Long signs may exceed the planned level, and the "high utility" list requires editorial selection. It is undefined whether an error ends the mission, how to look up a sign, or how to demonstrate that the expression's reading has been learned beyond recognition.

## Priority improvements

1. Choose one action in the MVP: locate the sign or door satisfying the mission. Use one station scene and one shop scene, without continuous navigation.
2. Vary position and appearance so the answer depends on text. Arrows remain consistent with the mission, but do not reveal by themselves which exit or condition is correct.
3. Show the chosen sign, its reading, and the consequence after the attempt. Help can reveal reading/gloss on demand; a lookup neither removes points nor becomes a separate comprehension error.

## Recommended MVP

Six missions per session, each with three or four curated signs and known expressions. A short instruction in English gives the objective; the action is tapping the corresponding sign. On the keyboard, Tab/arrow keys and Enter select the same target. There is no timer. A round ends with a correct choice or solution lookup. An inappropriate choice shows the relevant textual difference and allows correction, recording the first attempt and assistance. After completion, present expression, reading, and gloss, with a short usage sentence when reviewed. The session ends after six missions or a voluntary exit. A separate reading question can later assess production; choosing the door records comprehension of the expression without assuming mastery of all its readings.

## Defer

Hospital, supermarket, dozens of signs, chained consequences, extensive scenes, and speed pressure.

## Validation criteria

- Each mission has an unambiguous correct action with reviewed signs appropriate to the level.
- Position and appearance changes neither break arrow consistency nor reveal the answer through a visual pattern.
- The player can consult help and correct answers through touch and keyboard.
- Test expressions in a different scene and observe comprehension without the familiar screen arrangement.
