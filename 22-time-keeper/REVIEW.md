# Design Review — 22. Time Keeper

The recommendations assess the [translated specification](./SPECIFICATION.md), preserving the original wording of the [brainstorm](../brainstorm-minijogos-japones.md). Design review recommendations remain separate and unapplied.

## Assessment

The task is clear: transform a message into an appointment's day and time. The specification combines a monthly calendar, analog clock, typing, and relative expressions, expanding implementation. The first version needs a simple representation and must separate understanding a number from producing its reading; acting on the calendar does not prove the latter.

## Strengths and gaps

Positioning an event creates a concrete result without requiring translation. Reading mode already acknowledges that irregularities need their own practice. Hours and days offer an easily bounded progression.

Dates with a weekday need a year; the examples do not provide this context. Copying the month and day alongside a fixed abbreviation can generate a message incompatible with the chosen calendar. Relative dates need a visible reference, such as "today" and a simulated current time, including at month or year boundaries. The analog clock also does not distinguish morning from afternoon by itself. Dragging hands combines motor precision with reading and may be difficult on phones. Generating valid dates does not resolve their readings: a reviewed table with accepted variants is needed. Finally, the four-second limit should depend on accuracy rather than be the initial behavior.

## Priority improvements

1. Fix a visible year and week in a simulated schedule. Generate dates and weekdays from the same reference. Relative expressions are left for a later mode, with an explicit reference date.
2. Use day buttons and simple hour/minute controls in the MVP. Understanding 午前/午後 should change a visible state; do not require fine adjustments of clock hands.
3. Record positioning and typed reading separately. Keep readings in a curated table, accepting relevant variants without inventing rules from the written number.

## Recommended MVP

Six messages per session, one at a time, within a displayed week showing month and year. Start with whole hours and half hours, in morning/afternoon. The player selects day, hour, and period, then confirms; touch and Tab/arrow keys/Enter offer the same controls. A round ends with a correct confirmation or solution lookup. An error highlights only divergent fields and preserves the others. Help allows the meaning of an expression to be revealed. Feedback shows message, resulting date/time, and reviewed reading. Two short kana-typing rounds selected within the session check an irregular reading without attributing that mastery to positioning. No timer. The session ends after six messages and these checks, or a voluntary exit, preserving confirmed answers.

## Defer

Full monthly calendar, draggable hands, four-second deadline, varied minutes, and relative expressions.

## Validation criteria

- Every date, weekday abbreviation, and temporal reference matches the displayed year/week.
- Morning/afternoon and half hours produce distinct, visible positions in the schedule.
- Accepted readings are reviewed, and evidence separates comprehension from kana production.
- Observe answers with new day/time combinations to check comprehension beyond memorizing messages.
