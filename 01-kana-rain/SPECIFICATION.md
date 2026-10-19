# 01 — Kana Rain: simplified specification

**Catalogue ID:** 01. **Baseline:** release 1.8.0, 18 October 2026.

The [README](README.md) gives setup and current behavior. Original catalogue proposals remain [historical evidence](../docs/history/kana-rain/SPECIFICATION.md).

## Core game

The title screen offers exactly two choices: Hiragana/Katakana and Easy/Normal/Hard. Both alphabets always use romaji. Any visible matching drop can be cleared; forced invalid submissions belong to the highlighted drop. Katakana retains the existing basic-Hiragana unlock requirement.

Regular runs last three minutes, with three hearts on every difficulty. The existing Normal curve applies universally: 10-second initial falls, acceleration capped at 3.5×. The curve reads an effective time, not the clock: +1.6 seconds per correct answer, −20 seconds per expiration, never below zero. A drop expiring takes one heart and clears unfinished input; a wrong answer stains and accelerates its drop. Zero hearts ends the run. Score, streaks, pronunciation, celebrations, danger cues and reduced effects remain.

Complete readings submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play; Enter submits immediately. Pauses and countdowns freeze simulation and pending answer delays. Ordinary pauses preserve partial input.

Touch input uses the sound pad: a fixed grid of 15 consonant families, then that family's sounds in nine fixed slots (five vowel columns, three yōon, final n) in the same space. It produces the same romaji readings and covers all 208 forms in two taps; nothing on the pad depends on the falling kana. Compositions submit immediately. An unmatched composition is a mistake for the drop highlighted when it began. The exact cell resolves homophones; another row with the same accepted sound still counts. Portrait places the pad below the rain and short landscape beside it. The native keyboard opens only on request; physical typing is unchanged.

## Difficulty and new kana

Difficulty selects recovery of first presentations after a pressure pause: Easy 55/60 (default), Normal 25/30, Hard 10/12. Four misses — wrong first answers on kana seen before that drop — in the selected window pause never-presented kana; expirations alone do not. Recovery requires the full window, the first-try hit target and fewer than four misses. This is not a prerequisite before every debut; hearts and rain speed are identical across levels.

Three completed familiar drops precede and separate nonstarter debuts. Each run allows at most two distinct nonstarter debuts and one debut on screen. Starter vowels bypass pressure, spacing and the two-debut budget but not the one-debut limit. First presentations and up to 60 completed outcomes persist across runs; earned rows remain eligible. See [exact admission rules](NOVELTY_BALANCE.md).

Rows unlock after every available kana has two correct first answers and at least 85% submitted first-answer accuracy. Hints are allowed. Corrected retries and expirations do not supply qualifying hits. Independent recall remains separately recorded evidence.

## Menus, results and compatibility

Session preparation lives only on the title screen. Settings contains device effects and analytics/privacy. My Kana Garden retains familiarity, row audio, readiness, export and collapsed learning details. Results emphasize points, best streak, first-try hits and expirations, then name the next row with the first-try hits its closest unready kana still need, with audio mistake cards and a focused one-minute review shortcut. Review also starts with three hearts.

The title menu fits the viewport without internal scrolling. Alphabet/difficulty fields are centered; the entry and romaji hints follow the menu on separate lines. Limited-height and mobile layouts preserve those boundaries.

The shared learner storage key/schema and persistence architecture remain unchanged. Attempts, exposures, earned rows, previous record keys, accuracy and novelty pressure survive. Unsupported old selections normalize without deleting their history; new arcade records use their own ruleset. Historical design archives remain separate from active UI.

Offline caching, exact audio mappings, responsive menus, accessible controls and opt-in analytics remain. Production builds use an explicit allowlist and exclude private progress, test artifacts and design documents.
