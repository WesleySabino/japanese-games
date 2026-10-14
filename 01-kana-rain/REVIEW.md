# 01 — Kana Rain: simplified design review

**Baseline:** release 1.5.0, 14 October 2026. Sources: [specification](SPECIFICATION.md), [game documentation](README.md), [admission rules](NOVELTY_BALANCE.md).

## Direction

One arcade loop drives play: read falling kana, build a score, protect three hearts and try to improve the next run. Alphabet and difficulty are the only pre-run decisions. Difficulty controls how cautiously new kana resume after missed drops; the rain curve, hearts and three-minute duration stay consistent.

The established garden, typography, mobile keyboard, audio, pressure, wrong-answer acceleration, records, streak celebrations and row rewards remain. New-kana admission operates in the background without a diagnostic HUD. Results foreground game outcomes; deeper independent/assisted evidence remains in a collapsed Garden section.

## Accepted simplification

- Keep only Hiragana and Katakana, both answered in romaji.
- Use one Easy/Normal/Hard selector; Easy defaults to the approved 55/60 recovery rule, Normal to 25/30 and Hard to 10/12.
- Give every run three hearts and the former Normal active-time rain curve.
- Fix regular runs at three minutes; keep focused mistake review at one minute.
- Prepare sessions only on the title screen. Keep device effects and privacy in Settings.
- Preserve evidence and legacy records while isolating new-rule personal bests.

## Validation

- Supported alphabet and difficulty choices survive reload; unsupported legacy selections recover safely.
- Three hearts, identical acceleration and fixed duration apply to all levels, including review's three hearts.
- Two expirations close first presentations; full profile recovery reopens them. No per-debut threshold is introduced.
- Spacing, starter exceptions, session limits and one-debut-on-screen rules hold across normal queues, retries and confusion partners.
- Familiar earned content remains available while first presentations pause.
- Prefix answers auto-submit; longer answers remain typeable. Expiration clears partial input; an ordinary pause preserves it.
- Results report points, best streak, first-try hits and expirations accurately; retained learning details remain accessible but collapsed.
- Portrait/landscape layouts, touch play, audio, countdowns, menus, row unlocks and offline caching remain usable.
- All 11 title-menu viewport checks confirm centered fields, separated footer hints and no internal scrolling, including wide screens with limited height.
- Existing attempts, exposures, earned rows, records, accuracy and export remain intact.

Automated checks establish technical behavior. They do not demonstrate an optimal learning threshold or long-term retention. Continued playtesting should evaluate challenge, novelty pace and retention after the simplification. Earlier proposals remain in [the historical archive](../docs/history/kana-rain/README.md).
