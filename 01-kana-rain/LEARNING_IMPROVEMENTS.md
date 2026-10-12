# Kana Rain — learning and arcade update

9 October 2026. Arcade challenge is the main experience and the default for new and reset gardens. A player's chosen session style remains saved.

## Implemented changes

- Each question declares its assessed skill and answer format. Reading and matching hiragana to katakana have separate evidence; copying the displayed kana cannot count as reading.
- Attempts retain their first answer, assistance, error reason and timing. Expired drops are distinct from submitted wrong answers. Duplicate event delivery does not duplicate progress.
- References, pronunciation help and corrections mark related questions as assisted. The conservative spacing rule requires 60 seconds and responses to two other distinct items; it does not establish long-term retention.
- Word romaji variants follow kana units, nasal boundaries and gemination. All 60 reviewed primary readings remain accepted; 21 invalid variants are excluded.
- Optional Steady practice offers eight opportunities, one drop at a time, with a constant pace and no lost hearts. Arcade retains its timer, difficulty curves, hearts and separate records.
- Corrections survive pauses; practice corrections wait for explicit acknowledgement.
- First-response, input, display and waiting times are separate. Typing latency is not labelled pure reading speed or used as a familiarity speed bonus.
- Save status follows completed localStorage/IndexedDB writes. Failed persistence leaves an explicit warning and progress export available.
- Small っ/ッ, the long-vowel mark ー and long vowels written in kana have explicit introductions before dependent words are offered.
- Confusions follow the requested script and preserve ambiguous candidates rather than inventing a unique confusion.
- The garden labels all four estimated familiarity states. Results distinguish independent readings, script matches, assisted answers and expired drops. Row readiness now uses correct first answers, as described in the 12 October progression fix below.
- Analytics settings sit inside Settings, clear of the phone answer dock. Opening them keeps gameplay paused; the existing opt-in and data boundaries remain in place.
- Migration preserves earned rows, preferences and arcade records. Assistance in legacy records remains unknown.

## Design direction — 11 October 2026

Arcade challenge and the desire to play again guide the design. Learning happens through play; the game does not need to stop and teach or correct every mistake. Pressure, lost hearts and broken streaks remain part of the challenge. This revision restores the previous progression feedback and reference registration without changing the learner model, storage format or saved history.

Disposition of the eight design proposals:

1. **Independent-recall moments:** the progression correction from this revision is reverted, including suppressed reading/pronunciation after clean answers and visibility-based reference registration. Assessment scheduling and a recent-readiness window are not being introduced.
2. **Shelter for a corrected drop:** discarded; the proposed freeze and removal of post-error acceleration were never implemented.
3. **Short Arcade waves:** a future idea to evaluate for enjoyable challenges and climaxes, without prescribed study breaks. No wave system is added here.
4. **Guided first rain:** a future brief introduction to the controls, without the proposed protected recovery. No new onboarding is added here.
5. **Thumb-friendly input:** existing mobile improvements are preserved.
6. **Clear hits, points and bonuses:** existing score feedback and celebrations are preserved; reading and pronunciation feedback after successful answers is restored.
7. **Garden growth and the next goal:** future rewards should emphasize records, streaks and unlocks. No new reward system is added here.
8. **Optional recovery after Steady:** the proposed extra correction stage is discarded. Existing Steady practice remains available.

## Progression fix — 12 October 2026

The first-try success gate now uses the existing `firstCorrect` and `firstAttempts` counters: every available kana needs two correct first answers and at least 85% first-answer accuracy. Continuous successful play can therefore unlock new rows while normal reading and pronunciation feedback remains active. Corrected retries and expired drops do not satisfy the two-hit requirement. Earlier rows still participate in readiness.

The independent-recall classification, full attempt/exposure history, scoring, hearts, acceleration, feedback and celebrations remain unchanged. Independence is evidence, not an unlock requirement. The learner storage key, schema and IndexedDB database are unchanged; existing first answers contribute immediately and earned rows, records and preferences are preserved. A qualifying hit triggers the usual in-session unlock. Only the offline asset-cache version advances for release 1.3.3.

## Verification and development

The focused Chrome suite covers responsive layouts, corrections, persistence and word interactions. The arcade regression suite covers desktop and phone layouts, input, pause/resume, progression, difficulty, persistence, audio and offline use with 112 recordings. Run `pnpm test` for the full Node suite.

The reviewed word corpus is a local test fixture, so checks work in a fresh repository checkout. CI runs both the arcade browser suite and the focused improvement checks. Browser reports and screenshots are generated under the ignored tests artifacts directory.

See [README.md](./README.md) for local commands and current gameplay. [SPECIFICATION.md](./SPECIFICATION.md) and [REVIEW.md](./REVIEW.md) preserve the original catalogue and subsequent design rationale.
