# Review — 33. Word Dungeon

References: [translated specification](./SPECIFICATION.md) and [original brainstorm](../brainstorm-minijogos-japones.md).

The recommendations below are design proposals; they do not alter the original specification or represent test results.

## Assessment of the specification

The dungeon can give continuity and a destination to micro-challenges. Reusing modules and preserving answers are good foundations. Positioning it after the MVP is appropriate. The specification serves as a future vision but exceeds the first prototype: map, shop, coins, items, HP, elites, rest, boss, and unlocks create rules before validating the route’s benefit.

The hypothesis: a sequence with a beginning, progress, and an ending increases the desire to complete reviews while preserving response quality. It does not require an economy. Low load depends on existing modules that can be safely interrupted and reused.

## Specific issues and priority improvements

- **A short, linear route.** Start with three rooms and an exit/boss, without a graph map. A “room 2 of 3” indicator preserves a sense of progress and avoids manufacturing strategic decisions that take more time than reading.
- **A challenge contract.** The orchestrator should receive the result, help used, and the module’s resumption capability. Do not infer learning from damage dealt or victory. An answered challenge remains recorded exactly once when rooms change.
- **Help without a parallel economy.** Dictionary and furigana are available buttons, with assisted evidence recorded. Charging coins or offering bonuses for removing help early can encourage avoiding necessary support. For the prototype, an error opens correction and allows continuation; HP can wait until there is a demonstrated reason for it.

## Recommended MVP

A proposed three-to-five-minute run, with two challenge modes already implemented and a short final text suitable for the level. Each room contains a few Scheduler rounds; completing it opens a “continue” button. Touch and keyboard use the modules’ controls and Tab/Enter for navigation between rooms. An enemy icon and a short message preserve identity without elaborate animation.

Each round ends according to its module; the session ends on completing the last room or voluntarily leaving. Language feedback stays within the challenge; the summary shows what was practiced and offers to review a confusion. The boss uses questions with evidence in the text, without creating extra difficulty merely to justify the fiction. Pausing and resuming preserve progress. Do not introduce a separate content bank: the route organizes reviews rather than replacing their selection.

## What to defer and how to validate

Defer shop, coins, equipment, HP, elite paths, infinite floors, cosmetics, and meta-progression. Personalized enemies can come later, with welcoming language.

1. At least 85% of the run’s active time is spent on language challenges, in line with the brainstorm’s menu limit.
2. Leaving and resuming does not lose or duplicate responses or room progress.
3. All controls work through touch and keyboard, including on return from a module.
4. Completing the route does not depend on buying help or abandoning difficult content; assisted review remains accessible.
