# Review — 34. Kanji Survival + Rematch

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The proposal can simplify varied daily review. Using the Scheduler and presenting confusions again in another context avoids parallel content selection. Inclusion in the MVP is consistent with a few formats available. Low complexity depends on reusing them, rather than implementing five question types within Kanji Survival + Rematch.

There are tensions to resolve: endless mode versus short sessions; three lives and half-life restoration with undefined criteria. These rules can end review for players who need support. Rematch is clear, but a correct answer in a new format does not prove lasting correction of an error.

## Specific issues and priority improvements

- **A predictable ending.** Offer a short review batch and a natural ending when it is complete; if there are no due items, do not invent an infinite queue. Survival mode can be optional, with assisted correction after lives run out.
- **Announced format.** Varying reading, meaning, and context does not mean changing controls without guidance. Each question should name the expected action and show the input before any timing begins. Record facet, format, and help, distinguishing a language error from an operational change.
- **Positive, editorially reviewed Rematch.** Choose a few eligible recent confusions, without needing to reproduce a “crime history.” Show the original contrast and a new opportunity, with accessible reading/gloss help. If no reviewed alternative context is available, wait for better content instead of producing a questionable round.

## Recommended MVP

Ten reviews per proposed session, with two ready formats: reading production and a context challenge. Reading input accepts keyboard/IME and a virtual kana keyboard; the other format uses buttons with touch or Tab/Enter. Each confirmation ends the round and saves the answer immediately. Do not impose speed on new or weak items.

Feedback explains the error, allows lookups, and offers an assisted attempt without erasing the first evidence. On completing the batch, the summary offers up to three Rematch items in different contexts when available. This small section tests the idea before creating a weekly event. Voluntary ending preserves everything. Scoring, if present, is distinct from the learning record; restoring lives does not artificially change mastery evidence.

## What to defer and how to validate

Defer endless mode, half-lives, a mandatory weekly boss, five simultaneous formats, adaptive pressure, and elaborate visual identity. No promise about hypercorrection needs to support the MVP; behavior will be observed.

1. Every response is saved exactly once, including when leaving, resuming, or retrying with help.
2. The session has a natural ending and allows continued learning after errors, without blocking lookups.
3. Rematch items come from actual errors and have documented compatible facets and contexts.
4. A correct Rematch answer is checked later on another occasion; it does not by itself erase the confusion or declare permanent mastery.
