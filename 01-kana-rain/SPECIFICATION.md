# 01 — Kana Rain: simplified specification

**Catalogue ID:** 01. **Baseline:** release 1.10.2, 22 October 2026.

The [README](README.md) gives setup and current behavior. [Development](DEVELOPMENT.md) covers implementation and validation; [learning design](LEARNING_DESIGN.md) explains the evidence and its limits. This specification describes the current game; superseded proposals remain in Git history.

Result actions stay visible on small screens, scrolling details independently. Sound-pad keyboard activation moves focus into the selected family's enabled sounds and back to that family on Back/submission; touch does not force focus or open the native keyboard. Settings and the main sound button share the existing persisted sound preference for pronunciation and effects. These changes do not alter learner storage or progression rules.

## Core game

The title screen offers Hiragana/Katakana and Easy/Normal/Hard. New gardens begin with Hiragana only; Katakana unlocks after completion of the 104-form hiragana catalogue. Both alphabets are answered by sound, with romaji typing or the sound pad; no answer control depends on the falling kana. Katakana's support label is its hiragana partner rather than romaji: a debut drop shows it, and corrections, review cards and garden tiles name it. Existing Katakana access remains available.

Regular runs last three minutes, with three hearts on every difficulty. The existing Normal curve applies universally: 10-second initial falls, acceleration capped at 3.5×. The curve reads an effective time, not the clock: +1.6 seconds per correct answer, −20 seconds per expiration, never below zero. A drop expiring takes one heart and clears unfinished input; a wrong answer stains and accelerates its drop. Zero hearts ends the run. The live HUD shows correct answers and the timer around large central hearts; streaks, pronunciation, celebrations, danger cues and reduced effects remain.

Complete typed readings submit automatically. Ambiguous prefixes such as `n` wait 300 ms of active play; Enter submits immediately. Any visible matching drop can be cleared; forced invalid submissions belong to the highlighted drop. Pauses and countdowns freeze simulation and pending answer delays. Ordinary pauses preserve partial input.

Touch input uses the sound pad for both alphabets: a fixed grid of 15 consonant families, then that family's sounds in nine fixed slots (five vowel columns, three yōon, final n) in the same space. It produces the same romaji readings and covers all 208 forms in two taps, a katakana sharing its hiragana partner's cell; nothing on the pad depends on the falling kana. Compositions submit immediately. An unmatched composition is a mistake for the drop highlighted when it began. The exact cell resolves homophones; another row with the same accepted sound still counts. Portrait places the pad below the rain and short landscape beside it. Phone portrait uses one compact status row, with listen, garden and sound tools on the answer line; two family rows fit when the pad is at least 316 px wide, otherwise it retains three. Touch targets remain at least 36 px. Phone drop width and height are reduced by 40%; normalized fall timing does not change. The native keyboard opens only on request; physical typing is unchanged.

The catalogue has 104 exact hiragana/katakana pairs, with 104 forms per script (46 basic, 20 dakuten, five handakuten and 33 yōon). Katakana support labels use pair identity rather than shared romaji, so ヂ names ぢ, not じ. Extended loanword combinations, standalone small kana, small tsu and the long-vowel mark are outside the assessed catalogue.

Wrong-answer feedback, mistake-review cards and result readiness hints only display Katakana already marked as presented, not merely unlocked. This includes confusion arrows, echoed pasted input, review audio and accessibility labels. Filter review candidates before recording result-review exposures or starting focused practice. Result readiness totals still include unintroduced forms, counted in the remaining-kana label; Katakana row-unlock announcements use the row name without future glyphs. Preserve the original submitted response and confusion evidence, including older history; only the displayed feedback and review selection change. My Kana Garden remains an explicit curriculum reference.

## Counting answers

Each accepted correct submission counts once, including corrections. Each submitted wrong answer counts once; two errors followed by correction produce one correct and two wrong answers. An untouched expiration produces only one expired drop. A wrong answer followed by expiration produces one wrong answer and one expired drop. Partial typing, blanks, countdown input and repeated finish calls add nothing.

Correct answers appear during play. Wrong answers and expirations remain recorded internally and appear only in the final results; large central hearts show remaining lives. The final totals retain the same counting rules. Counters start at zero for each normal or focused review run. First-try evidence, row readiness and novelty recovery remain separate; a corrected answer does not become a first-try hit. Adaptive rain continues using the existing correct-answer and expiration totals, with no new penalty for wrong answers.

## Difficulty and new kana

Any wrong submission or expiration pauses new kana immediately until ten consecutive first-try familiar hits. Corrections and debut hits are neutral; another failure resets recovery. This pause persists across restarts and reloads while familiar rain continues.

Difficulty selects recovery after the longer brake closes: Easy 55/60 (default), Normal 25/30, Hard 10/12. Two expirations or four familiar first-answer misses in the selected window close this brake. Recovery requires the full window, the hit target, fewer than two expirations and fewer than four misses. The window target is not a prerequisite before every debut; hearts and adaptive rain are identical across levels.

Katakana evaluates the longer brake using a saved Katakana-only window, initialized once from identifiable Katakana evidence. It does not inherit Hiragana failures. The original novelty history remains intact and continues to govern Hiragana; its immediate ten-hit cooldown still applies to both alphabets. Real Katakana failures close and recover the Katakana brake with the same thresholds. Reloading, starting a run or switching alphabets cannot reset either history.

Three consecutive familiar first-try hits precede and separate nonstarter debuts, with one debut on screen. Hiragana allows at most two distinct nonstarter debuts per run. Katakana limits new nonstarter kana still below the two-first-hit/85% readiness rule to two at a time; a ready kana frees a slot during the same run. Both brakes and familiar spacing still apply before every introduction. Starter vowels bypass spacing and this budget but respect both brakes once familiar content exists; one starter can bootstrap an empty alphabet. First presentations and up to 60 completed outcomes persist; earned rows remain eligible. See [exact admission rules](NOVELTY_BALANCE.md).

Rows unlock after every available kana has two correct first answers and at least 85% submitted first-answer accuracy. Hints are allowed. Corrected retries and expirations do not supply qualifying hits. Independent recall remains separately recorded evidence.

For a new garden with `katakanaUnlocked: false`, Katakana requires all 27 hiragana groups to be open and every one of the 104 hiragana to meet that readiness rule. Opening the final group alone is insufficient. Access is monotonic once earned. On first loading a save without the flag, earlier basic-row access or existing Katakana progress retains access; no historical hits are fabricated or rewritten.

New Katakana attempts are recorded like Hiragana ones: `form→sound`, `responseFormat: 'romaji'` and `inputMethod` `typing` or `composer`, with the usual assistance rules. Attempts from the retired choice format keep `hiragana-choice` and `recognition-options` and never count as independent recall. Existing romaji and retired-mode evidence stays unchanged.

## Menus, results and compatibility

Session preparation lives only on the title screen. Settings contains device effects and analytics/privacy. My Kana Garden retains familiarity, row audio, readiness, export and collapsed learning details. Results emphasize correct answers, wrong answers and expired drops, with first-try/correction counts and best streak as secondary details, then name the next row with the first-try hits its closest unready kana still need, with audio mistake cards and a focused one-minute review shortcut. Review also starts with three hearts.

The title menu fits the viewport without internal scrolling. Alphabet/difficulty fields are centered; the entry and answer-format hints follow the menu on separate lines. Limited-height and mobile layouts preserve those boundaries. `pnpm test:katakana-bridge` exercises the gate, katakana typing and pad input, and hiragana-partner hints alongside the existing suites.

The shared learner storage key/schema and persistence architecture remain unchanged. Attempts, exposures, earned rows, previous record keys, accuracy and novelty pressure survive. Unsupported old selections normalize without deleting their history; point-record comparisons and writes are retired. No historical point record is converted into a count. Historical design archives remain separate from active UI.

Offline caching, exact audio mappings, responsive menus, accessible controls and opt-in analytics remain. Production builds use an explicit allowlist and exclude private progress, test artifacts and design documents.
