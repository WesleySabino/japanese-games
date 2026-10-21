# 01 — Kana Rain: simplified design review

**Baseline:** local preview 1.10.1-local.2, 20 October 2026. Sources: [specification](SPECIFICATION.md), [game documentation](README.md), [admission rules](NOVELTY_BALANCE.md).

## Direction

One arcade loop drives play: answer falling kana, track correct answers and mistakes, protect three hearts and try another run. Alphabet and difficulty are the only pre-run decisions. New gardens begin with Hiragana, then unlock Katakana after completing all 104 hiragana across 27 groups. Difficulty controls how cautiously new kana resume after missed drops; the rain curve, hearts and three-minute duration stay consistent.

The established garden, typography, hiragana sound pad, audio, pressure, wrong-answer acceleration, historical records, streak celebrations and row rewards remain. Katakana uses three hiragana choices that stay stable per round; players can select the falling drop they want to match. New-kana admission operates in the background without a diagnostic HUD. Results foreground game outcomes; deeper independent/assisted evidence remains in a collapsed Garden section.

## Accepted simplification

- Keep only Hiragana and Katakana. Hiragana uses romaji typing/composition; Katakana uses three hiragana choices without a keyboard.
- Require all 104 hiragana to meet two correct first answers and 85% first-answer accuracy, with all 27 groups open, before new gardens gain Katakana access. Preserve earlier access and all saved progress.
- Record Katakana choices as assisted recognition (`hiragana-choice`, `recognition-options`), never independent recall. Keep the 104 exact script pairs distinct, including homophones and yōon; additional forms are outside this catalogue.
- Use one Easy/Normal/Hard selector; Easy defaults to the approved 55/60 recovery rule, Normal to 25/30 and Hard to 10/12.
- Give every run three hearts and the former Normal active-time rain curve.
- Fix regular runs at three minutes; keep focused mistake review at one minute.
- Prepare sessions only on the title screen. Keep device effects and privacy in Settings.
- Preserve evidence and historical point records without converting or overwriting them with answer counts.

## Validation

- Supported alphabet and difficulty choices survive reload; unsupported legacy selections recover safely.
- Three hearts, identical acceleration and fixed duration apply to all levels, including review's three hearts.
- Any wrong submission or expiration starts the ten-hit familiar recovery pause. Two expirations or four familiar first-answer misses also close the longer profile brake; no per-debut window threshold is introduced.
- Spacing, starter exceptions and one-debut-on-screen rules hold across normal queues, retries and confusion partners. Hiragana keeps its two-debut run limit; Katakana can introduce another after one of its two new nonstarter kana reaches readiness, without bypassing either brake.
- Familiar earned content remains available while first presentations pause.
- A cold Katakana alphabet does not inherit the longer brake from Hiragana; its own saved failures still close that brake. The original shared ten-hit pause remains effective, and neither mode switching nor reloading resets pressure.
- Hiragana prefix answers auto-submit; longer answers remain typeable. Expiration clears partial input; an ordinary pause preserves it. Katakana ignores typing and composer handlers and accepts only a choice for the selected live round.
- Results report correct answers, wrong answers and expirations, with first-try/correction totals and best streak as secondary details; retained learning details remain accessible but collapsed.
- Portrait/landscape layouts, touch play, audio, countdowns, menus, row unlocks and offline caching remain usable.
- All 11 title-menu viewport checks confirm centered fields, separated footer hints and no internal scrolling, including wide screens with limited height.
- Existing attempts, exposures, earned rows, records, accuracy and export remain intact.
- `pnpm test:katakana-bridge` covers the completion gate, legacy access, stable three-option interaction, continued Katakana progression in the same run and assisted recognition evidence in isolated browser profiles.

Automated checks establish technical behavior. They do not demonstrate an optimal learning threshold or long-term retention. Continued playtesting should evaluate challenge, novelty pace and retention after the simplification. Earlier proposals remain in [the historical archive](../docs/history/kana-rain/README.md).
