# Kana Rain learning design

This document explains the learning rationale for the current game. The [README](README.md), [specification](SPECIFICATION.md) and [admission rules](NOVELTY_BALANCE.md) define its behavior and numeric policies. Those policies are design choices to calibrate through playtesting, not research findings or validated learning thresholds.

## What the game asks the player to do

Kana Rain practices answering a visible kana with its sound, using romaji typing or the fixed sound pad. Katakana uses its exact Hiragana partner as support. The catalogue and its exclusions are documented in the specification; completing it does not establish general Japanese proficiency, word comprehension, listening ability or full spelling competence.

The pad does not offer answers selected for the current drop. It constructs a reading from fixed sound families and slots. This differs from the retired per-drop Hiragana choices, which could permit elimination without reading the Katakana. Neither input method assesses spoken production. Pronunciation playback is support, not a listening test, because the written prompt remains visible.

## Keep the meanings of progress separate

- **Presented:** the kana has appeared as a playable drop. `seen` does not mean learned; unlocking a row or consulting a reference is a different event.
- **Arcade readiness:** first-answer success and accuracy determine earned access. Assisted first-try hits can qualify; corrections and expirations cannot supply qualifying hits. This is a progression rule, not a certificate of independent recall.
- **Learning evidence:** hints, recent reading/audio help and earlier errors remain recorded as assistance. A drop created while assistance applies remains assisted for that round. The conservative independence rule is described in the README; satisfying it still does not demonstrate delayed retention.
- **Admission pressure:** failures restrict new presentations while familiar practice continues. Readiness, familiarity estimates and admission pressure have different purposes; none should silently replace another.

New answers retain `form→sound`, `responseFormat: 'romaji'` and their actual `inputMethod` (`typing` or `composer`). Earlier `hiragana-choice` events retain `recognition-options` assistance: changing the interface must not turn recognition history into independent-recall evidence. Preserve original responses, ambiguous confusion candidates and unknown legacy assistance rather than inventing a more favorable interpretation.

## Measure answers without overstating them

A correct accepted submission counts as correct gameplay even after correction. Every submitted wrong answer is an error; an expired drop is a separate outcome. A wrong submission followed by expiration produces both events. Several wrong submissions on one drop do not become several completed rounds. Blank or unfinished input is not an assessed answer.

First-answer accuracy, corrected answers, expirations and independent/assisted evidence must remain distinguishable. A successful debut can contribute to row readiness without repaying the familiar-practice admission pause. Preserve these distinctions in results, persistence and tests.

First-response, input, display, waiting and time since help are different measurements. Pauses and pending-input handling must not invent extra responses or reading time. Typing latency is not pure reading speed; touch composition, physical keyboards and IME use should not be compared as though their motor demands were identical. Preserve meaningful spelling contrasts and explicitly accepted variants; a shared pronunciation does not erase the identity of homophone kana.

## Feedback and manageable challenge

Feedback should help with the presented target without introducing additional unfamiliar Katakana through confusion arrows, pasted responses, review cards or result hints. Keep the target and its Hiragana support useful, retain the real submitted evidence, and apply presentation checks before generating review exposures. The Garden remains an explicit curriculum reference.

New-presentation limits and adaptive rain address different sources of overload. Familiar practice remains available during recovery, and earned access is preserved. Katakana has its own longer pressure history so earlier Hiragana difficulties cannot strand it; the immediate failure pause remains shared. Exact rules belong in NOVELTY_BALANCE.md.

These mechanisms are responses to observed play difficulties, not proof of optimal instruction. Simulated players and automated tests can expose mechanical failures; they cannot establish learning efficacy or model unmeasured cognitive overload. Use predictable keyboard/touch controls, readable Japanese and feedback that does not depend only on color. The timed arcade remains a limitation for some players, not evidence of accessibility conformance.

## Research carried forward, with its original limits

The links below preserve the earlier project's research trail. They were not freshly reviewed for this document; the access notes describe that original work.

- [Roediger and Karpicke, 2006](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/): **abstract only**. Retrieval testing of prose benefited later assessments relative to rereading; this does not validate Kana Rain or its parameters.
- [Cepeda and colleagues, 2008](https://digitalcommons.usf.edu/psy_facpub/1766/): **abstract only**. Useful spacing depends on the intended retention interval; it does not supply a universal game schedule.
- [Long and colleagues, 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13403799/): **abstract and context**. Earlier notes describe 58 Chinese-speaking learners studying 30 Japanese–Chinese pairs; delayed tests measured recognition. Do not generalize this to delayed production, alphabetic-language beginners or a special benefit of typing.
- [Habgood and Ainsworth, 2011, accepted manuscript](https://shura.shu.ac.uk/3556/): **full text read in the earlier review**. The comparison warns that better performance inside an educational game need not imply better delayed learning; it is not an evaluation of Kana Rain.
- [TUFS: long vowels](https://www.coelang.tufs.ac.jp/ja/en/pmod/practical/02-02-01.php): cited as a linguistic teaching reference, without a recorded complete-review claim. Written form, sound, duration and keystrokes are not interchangeable; the current assessed catalogue has explicit limits.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): cited as accessibility guidance, including language identification and timing considerations. The earlier notes do not document a conformance audit of this game.

Any future learning evaluation needs an explicit question, consenting participants, delayed assessment and transfer tasks distinct from practiced material. Enjoyment, return visits, in-game accuracy and retained learning are different outcomes. Page views and ordinary local progress do not make players implicit study participants.
