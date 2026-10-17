# New kana admission — simplified arcade

**Release baseline: 1.5.0, 14 October 2026.** The title screen now exposes one Difficulty selector, while the existing admission engine retains its three saved pace profiles for compatibility.

**Release 1.7.0, 17 October 2026.** The brake now reads reading instead of speed: it closes on first-answer misses on already-seen kana, and expirations no longer close it. The shared rain curve now follows answers instead of the clock.

## Player-facing rules

| Difficulty | Stored profile | First-try recovery target | Completed-drop window |
|---|---|---|---|
| Easy — default | `calm` | 55 | 60 |
| Normal | `balanced` | 25 | 30 |
| Hard | `bold` | 10 | 12 |

Hiragana and Katakana, including focused mistake review, share up to 60 completed-drop outcomes across sessions and reloads. The selected difficulty controls the evaluated tail. **Four or more misses in that tail close first presentations** (`missLimit: 4`, the same on every difficulty). Recovery requires the profile's full window and its first-try hit target; it then also has fewer than four misses, because four would close the gate again. On Hard the hit target (10 of 12) already allows at most two drops that were not first-try hits.

**A miss is a wrong first answer on a kana that was already seen before that drop.** The drop counts once, when it completes, whether the player then corrected it or let it expire. Several wrong submissions on one drop are one miss. A wrong answer on a kana's debut drop is not a miss. **Expirations never close the gate:** under the old time-based rain they mostly measured speed, not reading. An expired drop still costs its heart and, not being a first-try hit, still delays recovery.

**Recovery is required after the brake closes, not before every debut.** An assisted first-try answer counts; correcting a wrong answer does not. A drop enters the window once when correctly answered or expired. Intermediate wrong submissions do not create another completed drop. Abandoning an unanswered drop does not fabricate a failure.

Three completed familiar drops precede the first nonstarter debut and separate subsequent debuts. At most two distinct nonstarter kana debut per run, with only one debut on screen. The budget is spent by presentation, not selection or success. A debut retains its identity until that drop leaves the screen. Repeat appearances do not consume another distinct debut.

Normal queues, unlocks, retries and confusion partners share the same presentation gate. When a queued debut is deferred, familiar content fills the rain without changing the shared rain curve. Each alphabet's five starter vowels bypass pressure, spacing and the two-debut budget, but retain the one-debut-on-screen limit. This prevents a new garden from stalling.

All earned rows remain eligible. A row unlock grants availability and does not force immediate presentation. There is no active-repertoire partition or admission counter in the HUD.

## Shared adaptive rain

Difficulty does not alter hearts, the rain curve, score or run length. Every run has three hearts and the former Normal curve: 10-second initial falls, acceleration capped at 3.5×. **The curve reads an effective time instead of the clock:** `max(0, correct × 1.6 − expirations × 20)` seconds, where `correct` counts the run's correct answers (corrections included) and `expirations` its expired drops. `rainSeconds()` in `src/game.js` computes it; `src/difficulty.js` and its frozen curve are unchanged.

So 50 correct answers reach the pace that 80 seconds of play used to, and the 3.5× ceiling arrives after about 94 net correct answers. Each expiration steps the pace back 20 seconds, which 12½ correct answers repay; the pace never drops below the opening one. Time alone no longer speeds the rain; pauses and countdowns change nothing. Every run starts from the opening pace.

Regular runs are three minutes; focused review is one minute. Expiration clears unfinished input and pending auto-submit; ordinary pauses preserve input.

The presets are player choices from approved playtests, not proven optimal learning values. Easy retains the preferred 55/60 balance as default. Normal and Hard bring novelty back after shorter recovery windows.

## Simulation

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

**Why four misses, not three.** With three, Easy stayed closed 39–45% of play for every model; the fast reader's brake closed more often than under 1.6.0. Four halves that share with equal or better progress. Typos point the same way: a reader who is right 97% of the time still averages 1.8 misses per 60 drops. That reaches three in about 27% of windows, but four in about 11%. The model cannot show what the brake protects, since overload from new kana is not modelled. "Never closes" is therefore a bound, not a recommendation.

**What each change does.** The reading brake alone, with the clock rain kept, left médio/Easy losing on hearts in 81% of runs (limit 3, 3 seeds): the adaptive rain fixes defeats, the brake fixes blocked debuts. The slow model still loses all three hearts in nearly every run, although it survives 125 s on average instead of 93 s. Its answers take 1.5–3.7 s, while the opening rain releases a drop every 2.4 s and the on-screen cap grows with correct answers. That lies outside these two changes.

The simulator is a scratch tool outside the repository; its player model is an assumption, not playtest evidence.

## Persistence and compatibility

`src/novelty.js` owns additive `games['kana-rain'].novelty` state. The shared learner storage key and schema are unchanged. First initialization replays terminal reading attempts by round and recognizes previous in-game initial hints and legacy answers. A replayed round is a miss when its kana was seen before the round and its first answer was wrong. Garden references do not count as playable debuts. Historical records without terminal outcomes are not invented as completed drops.

New window entries add a `miss` flag beside `firstCorrect` and `timeout`. **Saved state keeps `version: 1` and loads unchanged** — nothing is rewritten. Entries saved before the flag existed count as misses only when they were corrected (`firstCorrect: false`, `timeout: false`), because a correction always followed a wrong first answer. Old expirations never count, since they did not record whether a wrong answer preceded them. Old corrected debuts cannot be told apart and also count; they age out within 60 completed drops. A gate saved as closed stays closed until the new recovery condition holds.

Presentations and completions use the learner's journal/IndexedDB path. Attempts, exposures, independent/assisted classifications, row unlocks, accuracy and records are retained. Session budgets reset at the start; the pressure window does not.

Older 30- or 12-drop histories remain and grow toward 60; discarded samples are not fabricated or replayed. Changing difficulty between runs evaluates the same real history. Four misses in the selected tail can close the gate; an already closed gate opens only after that profile's full recovery condition. Active or paused sessions lock setup.

The prior `novelty.pace` preference maps to the new difficulty label, while the underlying profile identifiers remain compatible. Unsupported historical session choices are normalized separately. No history is erased by this UI simplification. New-rule personal bests are isolated from legacy scores, which remain exportable.

## Verification

Unit checks cover the four-miss brake and its debut and expiration exclusions, the three exact recovery boundaries, legacy entries without a `miss` flag, replayed misses, profile migration/switching, persistent history, setup locks, first presentation before an answer, distinct completed rounds, restart/reload, starter exceptions, spacing/budgets, queue refills and familiar play after budget exhaustion. `tests/adaptive-rain.test.cjs` covers the effective time: no acceleration from time alone, +1.6 s per hit, −20 s per expiration, the zero floor, the shared 3.5× ceiling and a fresh start each run. Browser checks repeat the brake, recovery and answer-driven acceleration with synthetic progress; responsive checks cover absent diagnostic UI and unchanged game controls.

`pnpm test`, `pnpm test:browser`, `pnpm test:novelty-presentation` and `pnpm test:novelty-pace` run isolated checks. Generated reports and screenshots remain in ignored test artifacts. The private `.release/` preview helper may seed a supplied export once; it is excluded from production and must not repeatedly replace later local play.
