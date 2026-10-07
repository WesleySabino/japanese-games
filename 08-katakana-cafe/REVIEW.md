# Review — 08. Katakana Café

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The proposals below need testing; word origins and meanings cited in the content require editorial review.

## Assessment

Serving orders gives reading a purpose and allows a small menu as a starting point. Inclusion in the original MVP is reasonable: it can integrate word and meaning recognition with few interface elements. The idea needs a central action. Selecting an icon, typing English, and assembling katakana are three different exercises; implementing all three simultaneously would undermine simplicity.

## Concrete issues

Reconstructing the source word does not guarantee understanding its current Japanese meaning. Assessment should require identifying the ordered item and treat etymology as an optional note. English spelling tolerance adds normalization, synonyms, and ambiguity without being necessary for the reading goal.

Emoji vary across systems and may represent similar items unclearly. A tray error may result from that representation rather than katakana. Options need reviewed meanings, without assuming clarity simply because an emoji exists.

Impatient customers, tips, and an increasing pace introduce pressure before accuracy. The number of simultaneous orders, failure conditions, and session ending are also undefined. Six icons constitute a choice among options: the theme does not remove the need to count this format toward the global multiple-choice limit. Phonological explanations and cultural notes must be checked before being presented as rules.

## Priority improvements

1. Limit the café to one order at a time and a small menu, with emoji accompanied by understandable labels when needed.
2. Make the initial goal identifying the Japanese meaning, without requiring the English source word to be written.
3. Add reverse assembly only for items already introduced, with shuffled tiles. This offers a production stage without creating a second English spelling-correction system.

## Recommended MVP

A session of six orders: four identification tasks and two assembly tasks using the same items. The first format shows the katakana word and three dish options; touch or numbered keys select. In the second, the item is shown and the player selects tiles to assemble its spelling; arrows, Enter, and Backspace operate the virtual keyboard.

A correct answer serves the item. An error keeps the order and highlights the correct correspondence before another assisted attempt. Help permits lookup of the gloss or spelling, recording the consultation. Each order ends on a correct answer or reveal; the session ends at the sixth, with identification and assembly summarized separately. No timer, tips, or penalty for waiting.

## Defer

English typing, simultaneous customers, combined orders, prices, monolingual descriptions, and an extensive etymology catalogue.

## Validation criteria

- All icons and labels clearly identify the menu items.
- Error feedback shows the current meaning, without requiring foreign origin as the answer.
- Both actions work with touch and keyboard.
- Lookups and option selection are not recorded as independent production.
