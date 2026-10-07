# Design Review — 23. Counter Market

This assessment proposes changes to the [translated specification](./SPECIFICATION.md), keeping the [brainstorm](../brainstorm-minijogos-japones.md) separate. Design review recommendations remain unapplied.

## Assessment

Assembling an order gives context to number, object, and counter, with few controls. The proposal combines comprehension, counter choice, sound changes, and inference about an unknown noun. Dividing these into progressive modes preserves simplicity. The main dependency is a reviewed table of permitted combinations and readings.

## Strengths and gaps

The order gives quantity a purpose and allows comprehension to be checked through action. Accepting variants avoids rigid rules. Comparing a noun and counter with the same form can be a later extension.

The description "the counter indicates a shape category" is an insufficient simplification for the full listed set. The text needs to present categories as guidance, without promising that an object's shape always determines a single choice. The singular field `words[].counter` also does not represent the common variants that the risks themselves require accepting. A counter may suggest a category, but cannot by itself identify which unknown object is requested from a shelf with several compatible options. Ambiguous emojis can introduce a visual error that looks linguistic. Assembling the correct quantity still does not demonstrate that the player can pronounce or write the number+counter reading. Confirmation, correction, and ending rules are missing.

## Priority improvements

1. Curate a few objects with visible names, unambiguous images, and a list of accepted counters in context. Start with three counters and small numbers; do not expand categories merely to complete the brainstorm's list.
2. Confirm the whole order before scoring. Allow editing quantity and object without counting every tap as an attempt; this separates exploring the controls from linguistic error.
3. Maintain number+counter readings in a validated table. Feedback shows the specific reading without deriving it from a generic phonetic rule. Inference without a noun comes only when there is sufficient evidence to distinguish candidates.

## Recommended MVP

Five orders per session, initially with one object and later two, using known vocabulary. The player taps a product and adjusts quantity with +/−, avoiding dragging multiple copies. On the keyboard, focus and Enter select, with equivalent quantity controls. A round ends with a correct order or answer lookup. An error highlights the divergent item or quantity and keeps the basket editable. Help reveals part of the order and records assistance. After confirmation, present the order, number+counter reading, and English gloss. A separate short typed-reading round can assess production without inferring it from the assembled order. No timer. The session ends after five orders or a voluntary exit, preserving confirmed answers.

## Defer

Long orders, unknown objects, rare counters, reverse mode, and a sound-change puzzle. Stock and money stay outside this game.

## Validation criteria

- Objects, counters, and readings have documented accepted combinations; relevant variants are not marked wrong.
- Images and names distinguish products without depending on emoji interpretation.
- Touch and keyboard assemble and correct the same order, without requiring precise dragging.
- Observe new object/quantity combinations, separating order comprehension from the ability to produce the reading.
