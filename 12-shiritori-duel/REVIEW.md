# Review — 12. Shiritori Duel

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

These proposals need validation; competitive advantage and learning are distinct outcomes.

## Assessment

The goal of responding with a word beginning with the previous word's ending is concise and encourages retrieval without a list of answers. The bot provides alternating turns and an opponent with a potentially small implementation. Readiness is partial: to work with beginners' vocabulary, rules and available continuations must be more explicit than the indication "200 words".

## Concrete issues

The specification does not define word repetition or whether spelling variants count as the same word. Without normalization, a person can repeat an item in another script; without a clear prohibition, they can maintain easy cycles.

Configurable rules for marks and long vowels change transitions, but the example コーヒー→ひ does not include the rule that would produce that result. Small forms, kanji, and mixed scripts also need a normalization policy and reviewed examples before accepting any input.

Vocabulary size does not guarantee continuations for every beginning. Choosing endings without a known response allows the bot to win through database limits, without measuring retrieval. Introducing new words increases this asymmetry. Ending in ん, responding incorrectly, failing to find a word, and timing out are distinct outcomes requiring separate records.

## Priority improvements

1. Fix one initial rule set, presented with examples: a reviewed noun set, no word repetition, and defined script equivalence. Leave special cases out of the first pack.
2. Have the bot choose only known items and check that a continuation remains for the player. Competitive strategy comes after testing lexical coverage.
3. Offer a meaning hint for a known candidate and an option to end. Help supports retrieval without immediately showing the form.

## Recommended MVP

The bot starts with a known word and its gloss. The player writes through the virtual keyboard or desktop field, confirms with Enter, and can correct before submitting. The system normalizes the accepted format, checks database membership, the required beginning, repetition, and prohibited ending, explaining the first violated rule.

Malformed input does not consume a turn. A valid word continues the chain; a word ending in ん ends the duel according to the announced rule, without equating to a lack of lexical knowledge. Help shows a candidate's meaning, records a lookup, and allows its spelling to be revealed if necessary. No timer. The session ends after ten player responses, a loss under the rules, no available continuation, or voluntary exit. The summary records independent words, help, and the ending reason.

## Defer

New words from the bot, strategic difficulty, time, restricted themes, kanji bonuses, and configurable transition rules.

## Validation criteria

- The same item in different spelling variants does not circumvent the repetition rule.
- Every move by the initial bot maintains an available known continuation.
- Invalid input, help, and rule-based defeat produce distinct records.
- The player understands the required beginning and can respond with touch and keyboard.
