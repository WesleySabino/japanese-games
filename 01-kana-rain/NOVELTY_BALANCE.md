# New kana admission

**Release 1.8.1, 19 October 2026.** Expirations once again signal overload. A persistent short pause prevents new kana immediately after any failure; the longer recovery brake also considers the recent expiration count. Familiar practice continues throughout.

## Immediate pause

Any submitted wrong answer, including one on a debut, immediately sets `cooldownRemaining` to 10 before the learner journal is flushed. Any expiration also resets it to 10. This does not pause gameplay or remove drops already on screen.

Only a first-try correct answer on a drop that was familiar before it appeared reduces the remaining count. Corrections and successful debut drops are neutral; another wrong answer or expiration resets the count. Thus ten consecutive familiar first-try hits are required after the latest failure. Assisted first-try hits qualify; this is admission pressure, not independent-recall certification.

The countdown is saved outside the session. Restart, reload, alphabet change and difficulty change cannot clear it. It is separate from `blocked`: an isolated failure need not demand the longer full-window recovery.

## Longer brake

| Difficulty | Stored profile | First-try recovery target | Completed-drop window |
|---|---|---|---|
| Easy — default | `calm` | 55 | 60 |
| Normal | `balanced` | 25 | 30 |
| Hard | `bold` | 10 | 12 |

Two or more expirations **or** four or more familiar first-answer misses in the selected tail set `blocked`. Reopening requires all of: the full window, its first-try hit target, at most one expiration, and fewer than four familiar misses. Both this brake and the short pause must permit a new presentation.

A familiar miss is a wrong first answer on a kana seen before its drop appeared. It enters the completed-drop window once when corrected or expired. Several wrong submissions on one drop remain one familiar miss, and a wrong debut does not manufacture a familiar miss. All expirations count independently of familiarity or prior typing. Intermediate wrong submissions start the short pause immediately but do not fabricate a completed outcome.

These window targets apply after the longer brake closes, not before every debut. The shared window retains up to 60 distinct completed outcomes across runs, scripts and focused reviews. Switching difficulty evaluates the corresponding tail without erasing history or the short pause.

## Presentation limits and continued practice

Three consecutive familiar first-try hits precede and separate nonstarter debuts; wrong answers, corrections and expirations reset this spacing. At most two distinct nonstarter kana debut per run, with only one debut on screen. The budget is spent at presentation. A debut keeps its identity until that drop leaves, although it is saved as seen immediately.

Normal queues, unlocks, retries and confusion partners share admission checks. Deferred new kana are replaced by familiar content. Earned rows remain available; `seen` means previously presented, not learned. Existing hinted or weak kana may still repeat.

Starter vowels bypass spacing and the two-debut budget, while respecting both brakes if any familiar content is eligible. With no familiar content, one starter can bootstrap an alphabet. The one-debut-on-screen rule always applies. Session budgets reset each run; pressure and cooldown do not.

## Persistence and compatibility

The shared learner key/schema, ledgers and storage architecture are unchanged. Novelty keeps `version:1` and adds `cooldownRemaining`; new completed entries also record whether the drop was familiar. This does not alter attempt/exposure evidence, independent/assisted classifications, earned rows, accuracy or personal bests (including historical and `arcade-v2` keys).

On load, valid saved cooldown values (0–10) are preserved. If absent or invalid, the latest ten saved outcomes initialize the pause conservatively: a failure starts at ten, and only explicitly recorded familiar first-try hits provide recovery credit. Older samples lack debut identity, so no familiar credit is invented. A last relevant incorrect attempt also starts the pause when initializing it, even without a terminal outcome. A clean ten-outcome tail initializes zero. The longer brake is reevaluated using saved recent expirations and misses immediately; no saved recent entry is rewritten or replaced.

When no valid novelty state exists, the existing evidence replay recognizes prior in-game readings and legacy answers, keeps distinct terminal outcomes, and now applies expiration pressure and the immediate pause as well. Garden references do not establish playable debuts. Unfinished errors pause without inventing completions. Older shortened histories grow toward 60; missing samples are not fabricated.

## Verification

Unit and browser regressions cover immediate wrong-answer deferral before completion, one versus two expirations, nine versus ten familiar first-try hits, a new failure during recovery, debut/correction neutrality, starter bootstrap, queue fallback, restart/reload, difficulty switches, legacy history and pending errors. Synthetic export/reload checks retain items, ledgers, rows, accuracy and records. Adaptive-rain regressions continue to verify unchanged hit/expiration effects, zero floor and shared ceiling. Production packaging excludes learner exports, tests and local helpers.

The thresholds are conservative design choices based on the reported overload, not a claim of proven learning efficacy. The old simulation below omitted cognitive overload and must not be used as validation of this fix.

## Shared adaptive rain

Difficulty does not alter hearts, the rain curve, score or run length. Every run has three hearts and the former Normal curve: 10-second initial falls, acceleration capped at 3.5×. **The curve reads an effective time instead of the clock:** `max(0, correct × 1.6 − expirations × 20)` seconds, where `correct` counts the run's correct answers (corrections included) and `expirations` its expired drops. `rainSeconds()` in `src/game.js` computes it; `src/difficulty.js` and its frozen curve are unchanged.

So 50 correct answers reach the pace that 80 seconds of play used to, and the 3.5× ceiling arrives after about 94 net correct answers. Each expiration steps the pace back 20 seconds, which 12½ correct answers repay; the pace never drops below the opening one. Time alone no longer speeds the rain; pauses and countdowns change nothing. Every run starts from the opening pace.

Regular runs are three minutes; focused review is one minute. Expiration clears unfinished input and pending auto-submit; ordinary pauses preserve input.

The presets are player choices from approved playtests, not proven optimal learning values. Easy retains the preferred 55/60 balance as default. Normal and Hard bring novelty back after shorter recovery windows.

## Historical 1.7.0 simulation — not validation of the current brake

The constants were checked with the level-design simulator: the real `src/*.js` in `node:vm`, a modelled player whose recall and reading time improve with practice, and 30 three-minute runs (three a day) per seed. Each cell reads *runs ended by losing all hearts / share of play with the brake closed / Hiragana rows unlocked after 30 runs*.

**Easy, 9 seeds — where the miss limit was chosen.** Every column except 1.6.0 uses the adaptive rain.

| Player model | 1.6.0: two expirations, clock rain | Limit 3 | **Limit 4 — chosen** | Brake never closes |
|---|---|---|---|---|
| iniciante (slow) | 100% / 94% / 3.78 | 99% / 45% / 7.22 | **99% / 28% / 8.00** | 100% / 0% / 8.78 |
| médio | 89% / 71% / 7.78 | 49% / 43% / 10.89 | **41% / 22% / 11.33** | 36% / 0% / 10.89 |
| rápido (fast) | 33% / 26% / 11.44 | 10% / 39% / 11.56 | **8% / 21% / 11.89** | 10% / 0% / 11.89 |

**Normal and Hard, 3 seeds, final constants.**

| Player model | 1.6.0 Normal | Final Normal | 1.6.0 Hard | Final Hard |
|---|---|---|---|---|
| iniciante | 100% / 74% / 5.33 | 100% / 6% / 8.67 | 100% / 38% / 5.67 | 100% / 0% / 9.00 |
| médio | 77% / 39% / 7.67 | 38% / 4% / 11.33 | 82% / 16% / 9.00 | 36% / 1% / 10.67 |
| rápido | 29% / 11% / 12.33 | 13% / 3% / 12.33 | 23% / 3% / 13.00 | 10% / 0% / 12.00 |

**Historical rationale for four misses.** With three, Easy stayed closed 39–45% of play for every model; the fast reader's brake closed more often than under 1.6.0. Four halves that share with equal or better progress. Typos point the same way: a reader who is right 97% of the time still averages 1.8 misses per 60 drops. That reaches three in about 27% of windows, but four in about 11%. The model cannot show what the brake protects, since overload from new kana is not modelled. "Never closes" is therefore a bound, not a recommendation.

**What each change does.** The reading brake alone, with the clock rain kept, left médio/Easy losing on hearts in 81% of runs (limit 3, 3 seeds): the adaptive rain fixes defeats, the brake fixes blocked debuts. The slow model still loses all three hearts in nearly every run, although it survives 125 s on average instead of 93 s. Its answers take 1.5–3.7 s, while the opening rain releases a drop every 2.4 s and the on-screen cap grows with correct answers. That lies outside these two changes.

The simulator is a scratch tool outside the repository; its player model is an assumption, not playtest evidence.
