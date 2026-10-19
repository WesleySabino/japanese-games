# 01 — Kana Rain: simplified specification

**Catalogue ID:** 01. **Baseline:** release 1.9.0, 19 October 2026.

The [README](README.md) gives setup and current behavior. Original catalogue proposals remain [historical evidence](../docs/history/kana-rain/SPECIFICATION.md).

## Core game

The title screen offers exactly two choices: Hiragana/Katakana and Easy/Normal/Hard. Both alphabets always use romaji. Any visible matching drop can be cleared; forced invalid submissions belong to the highlighted drop. Katakana retains the existing basic-Hiragana unlock requirement.

Regular runs last three minutes, with three hearts on every difficulty. The existing Normal curve applies universally: 10-second initial falls, acceleration capped at 3.5×. The curve reads an effective time, not the clock: +1.6 seconds per correct answer, −20 seconds per expiration, never below zero. A drop expiring takes one heart and clears unfinished input; a wrong answer stains and accelerates its drop. Zero hearts ends the run. The live HUD shows correct answers and the timer around large central hearts; streaks, pronunciation, celebrations, danger cues and reduced effects remain.

Complete readings submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play; Enter submits immediately. Pauses and countdowns freeze simulation and pending answer delays. Ordinary pauses preserve partial input.

Touch input uses the sound pad: a fixed grid of 15 consonant families, then that family's sounds in nine fixed slots (five vowel columns, three yōon, final n) in the same space. It produces the same romaji readings and covers all 208 forms in two taps; nothing on the pad depends on the falling kana. Compositions submit immediately. An unmatched composition is a mistake for the drop highlighted when it began. The exact cell resolves homophones; another row with the same accepted sound still counts. Portrait places the pad below the rain and short landscape beside it. Phone portrait uses one compact status row, with listen, garden and sound tools on the answer line; two family rows fit when the pad is at least 316 px wide, otherwise it retains three. Touch targets remain at least 36 px. Phone drop width and height are reduced by 40%; normalized fall timing does not change. The native keyboard opens only on request; physical typing is unchanged.

## Counting answers

Each accepted correct submission counts once, including corrections. Each submitted wrong answer counts once; two errors followed by correction produce one correct and two wrong answers. An untouched expiration produces only one expired drop. A wrong answer followed by expiration produces one wrong answer and one expired drop. Partial typing, blanks, countdown input and repeated finish calls add nothing.

Correct answers appear during play. Wrong answers and expirations remain recorded internally and appear only in the final results; large central hearts show remaining lives. The final totals retain the same counting rules. Counters start at zero for each normal or focused review run. First-try evidence, row readiness and novelty recovery remain separate; a corrected answer does not become a first-try hit. Adaptive rain continues using the existing correct-answer and expiration totals, with no new penalty for wrong answers.

## Difficulty and new kana

Any wrong submission or expiration pauses new kana immediately until ten consecutive first-try familiar hits. Corrections and debut hits are neutral; another failure resets recovery. This pause persists across restarts and reloads while familiar rain continues.

Difficulty selects recovery after the longer brake closes: Easy 55/60 (default), Normal 25/30, Hard 10/12. Two expirations or four familiar first-answer misses in the selected window close this brake. Recovery requires the full window, the hit target, fewer than two expirations and fewer than four misses. The window target is not a prerequisite before every debut; hearts and adaptive rain are identical across levels.

Three consecutive familiar first-try hits precede and separate nonstarter debuts. Each run allows at most two distinct nonstarter debuts and one debut on screen. Starter vowels bypass spacing and the two-debut budget but respect both brakes once familiar content exists; one starter can bootstrap an empty alphabet. First presentations and up to 60 completed outcomes persist; earned rows remain eligible. See [exact admission rules](NOVELTY_BALANCE.md).

Rows unlock after every available kana has two correct first answers and at least 85% submitted first-answer accuracy. Hints are allowed. Corrected retries and expirations do not supply qualifying hits. Independent recall remains separately recorded evidence.

## Menus, results and compatibility

Session preparation lives only on the title screen. Settings contains device effects and analytics/privacy. My Kana Garden retains familiarity, row audio, readiness, export and collapsed learning details. Results emphasize correct answers, wrong answers and expired drops, with first-try/correction counts and best streak as secondary details, then name the next row with the first-try hits its closest unready kana still need, with audio mistake cards and a focused one-minute review shortcut. Review also starts with three hearts.

The title menu fits the viewport without internal scrolling. Alphabet/difficulty fields are centered; the entry and romaji hints follow the menu on separate lines. Limited-height and mobile layouts preserve those boundaries.

The shared learner storage key/schema and persistence architecture remain unchanged. Attempts, exposures, earned rows, previous record keys, accuracy and novelty pressure survive. Unsupported old selections normalize without deleting their history; point-record comparisons and writes are retired. No historical point record is converted into a count. Historical design archives remain separate from active UI.

Offline caching, exact audio mappings, responsive menus, accessible controls and opt-in analytics remain. Production builds use an explicit allowlist and exclude private progress, test artifacts and design documents.
