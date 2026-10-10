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
- The garden labels all four estimated familiarity states. Results distinguish independent readings, script matches, assisted answers and expired drops. Readiness uses independent first answers.
- Analytics settings sit inside Settings, clear of the phone answer dock. Opening them keeps gameplay paused; the existing opt-in and data boundaries remain in place.
- Migration preserves earned rows, preferences and arcade records. Assistance in legacy records remains unknown.

## Verification and development

The release passes 48 Node tests and 14 focused Chrome checks. The arcade regression suite covers desktop and phone layouts, input, pause/resume, progression, difficulty, persistence, audio and offline use with 112 recordings.

The reviewed word corpus is a local test fixture, so checks work in a fresh repository checkout. CI runs both the arcade browser suite and the focused improvement checks. Browser reports and screenshots are generated under the ignored tests artifacts directory.

See [README.md](./README.md) for local commands and current gameplay. [SPECIFICATION.md](./SPECIFICATION.md) and [REVIEW.md](./REVIEW.md) preserve the original catalogue and subsequent design rationale.
