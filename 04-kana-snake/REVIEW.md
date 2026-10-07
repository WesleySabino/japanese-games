# Review — 04. Kana Snake

Based on the [translated specification](./SPECIFICATION.md) and the [original brainstorm](../brainstorm-minijogos-japones.md).

The adjustments are design hypotheses to test, without changing the original extracted specification.

## Assessment

Building a word by choosing kana in the correct order is clear and uses a familiar mechanic. The game may motivate keeping the spelling in mind. Its main weakness combines spelling, continuous movement, and route planning: the snake can make the exercise harder without making the reading more demanding. The motor-skill risk identified in the brainstorm needs an operational rule.

## Concrete issues

It is unspecified how to distinguish deliberately eating an incorrect kana from crossing the same cell because of limited space. Recording both as orthographic confusion would distort the evidence. Collision, respawn, ending rules, and the exact effect of shortening a small snake are also missing.

Prompts such as "fish" may allow more than one word or spelling in the database. The meaning must be linked to a known item with enough context. Showing romaji for the entire word removes much of the orthographic retrieval: this can be assisted initial practice, but does not demonstrate independent production.

Kana distribution must guarantee a viable route. Words with small or repeated units require an exact definition of what each collection adds, without switching between character and reading unit during the same session.

## Priority improvements

1. Prototype movement in steps: one command moves one cell. This preserves route choice and allows spelling to be observed before adding reflex demands.
2. On entering a kana cell, ask for confirmation before collecting it. Passing nearby no longer serves as evidence of error, and collecting remains a game decision.
3. Separate "restart route" from word errors. Collisions or lack of a path should not reduce vocabulary mastery.

## Recommended MVP

A small grid, a known word of two to four tiles, a short snake, and three distractors. The prompt identifies the target through meaning and minimal context, with optional scaffolds. Arrows control steps; mobile uses four large directional buttons. Enter or a button confirms collection. The partial word stays visible without revealing the remaining tiles.

An incorrect collection keeps the position and shows the contrast; the player can correct and continue. Help reveals the next tile and records a lookup. The round ends when the word is complete, showing its full spelling and meaning. A session contains five words, with pause and exit available. Scoring considers independent collections; route and collisions are counted separately.

## Defer

Continuous movement, acceleration, long snakes, survival, many simultaneous words, and Japanese sentences as prompts. Add speed only if the step-based route is interesting and the words are already read accurately.

## Validation criteria

- Every generated round has a possible route to the correct sequence.
- A direction error does not automatically become a kana confusion.
- Controls allow the word to be completed with touch and keyboard.
- The player can distinguish full-size and small tiles on the board without enlarging the screen.
