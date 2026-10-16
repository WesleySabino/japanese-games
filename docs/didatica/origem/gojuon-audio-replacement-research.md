# Japanese audio replacement — research and local pilot

**Observed:** 2026-10-08. **Decision:** reject the existing Kokoro pack for learner release and develop **VOICEVOX Nemo** as the first replacement. The [first structured native review](./audio/candidates/nemo/reviews/ROUND_01_REVIEW.md) approves 22 of the 32 pilot recordings, flags 8 for revision, and leaves 2 unsure. Male 1 has twelve approvals versus ten for Female 1; prioritize a controlled comparison of its four remaining words before a final narrator decision. Keep the playback/game design provider-independent.

The previous validation was insufficient for pronunciation. WAV integrity and unprompted ASR triage did not establish usable Japanese speech, and the user's listening found poor words. No transcript-match status should become pronunciation approval.

## Recommended route and actual evidence

Nemo is a Japanese, character-free narrator system with editable reading/accent information. Its official product page describes medium-quality speech; it should not be sold as a guaranteed human-quality or perfect educational voice. [Official product](https://voicevox.hiroshiba.jp/nemo/)

The pinned Windows CPU engine **0.24.0** was downloaded from the official release, checked against its published SHA-256, and run locally. The archive is 124,089,487 bytes (118.3 MiB). The extracted portable engine was measured at 276,082,792 bytes (263.3 MiB), excluding that archive and generated audio. No system-wide installer or GPU was required. [Official release](https://github.com/VOICEVOX/voicevox_nemo_engine/releases/tag/0.24.0)

Confirmed host: Intel i7-13620H, 16 logical CPU threads, 15.64 GiB physical memory (marketed as 16 GB), and NVIDIA RTX 5060 Laptop GPU with approximately 8 GB VRAM. The GPU had roughly 7.8 GB free at inspection. Available host RAM was low at that moment; Nemo nevertheless completed the pilot on CPU. This snapshot is not a minimum-RAM recommendation for other models.

**Actual pilot:** 16 words × two narrators = **32 real WAVs**, generated in **20.672 seconds** using two CPU threads. An observed engine working-set snapshot after generation was **324.6 MiB**; this is not a peak-memory measurement. All 32 query readings matched the explicit pronunciation annotations, and all WAVs passed format, non-silence, duration, and clipping checks. No Nemo audio was submitted to ASR or another ML evaluator.

Audition the [three-way comparison](./audio/candidates/nemo/comparison.html): original Kokoro, Nemo Female 1, and Nemo Male 1. The pilot includes tree, leaf, hand, eye, milk, ticket, school, coffee, house, flower, nose, cat, station, clock, hospital, and library. The queries and two independent narrator files are retained per word. Dictionary agreement is evidence about the input, not final listening approval.

Nemo offers explicit kana/accent edits and per-mora parameters, avoiding the Kokoro carrier-cropping workaround. Save each final AudioQuery and review actual speech, particularly single-mora nouns, long vowels, gemination, yōon, and lexical sense. The pilot returned the same isolated kana query for flower/nose; it does not establish their contextual accent contrast. [Engine/API documentation](https://github.com/VOICEVOX/voicevox_nemo_engine)

## Native review and controlled Nemo retakes

Initial comparative native-speaker feedback was followed by a complete [per-clip JSON assessment](./audio/candidates/nemo/reviews/nemo-review-0ad9fae5-2026-10-08T18-34-47-440Z.json). Its word/voice identities, WAV/query hashes, round, and summary were verified. Exact problem categories are now known; detailed notes and an accent reference were not supplied. Preserve the 22 approvals and use the [retake plan](./audio/candidates/nemo/reviews/ROUND_01_REVIEW.md) for the remaining cases. Approval belongs to an exact recording, not every future synthesis of that word.

**Empirical repeat test:** on 2026-10-08, the installed CPU engine 0.24.0 synthesized the saved Female 1 queries for tree, milk, and ticket twice each. Each pair was byte-identical. The hashes are preserved in [repeat-generation-probe.json](./audio/candidates/nemo/repeat-generation-probe.json). The engine was stopped afterward. This confirms reproduction for these inputs on this installation; it does not assert identical results across every engine build or device. Blindly rerunning the same Nemo query did not produce alternative takes.

Useful retakes change the relevant input deliberately:

- Correct a reading through the actual mora/accent phrase data. `AudioQuery.kana` is read-only and ignored during synthesis; editing that display field alone does not repair pronunciation. [Pinned schema](https://raw.githubusercontent.com/VOICEVOX/voicevox_nemo_engine/0.24.0/voicevox_engine/model.py)
- Correct accent position, then call `/mora_pitch` to recalculate the corresponding pitches. `/mora_length` predicts timing; `/mora_data` predicts both. Apply final manual adjustments afterward. Changing only the accent number leaves the old pitch values in place. [Pinned API](https://raw.githubusercontent.com/VOICEVOX/voicevox_nemo_engine/0.24.0/voicevox_engine/app/routers/tts_pipeline.py)
- Compare natural speed 1.0 with the pilot's 0.9, then adjust individual consonant/vowel lengths or pitch only when the reviewer identifies the relevant defect. Long vowels, small っ, and contracted sounds need their correct mora structure. A single global slower preset is not a pronunciation correction.
- Recognize model limits: intonation scaling has no effect when only one mora has voiced pitch, and this synthesis representation supplies a constant pitch within each mora. More CPU threads, GPU execution, or a higher output sample rate do not fix a lexical reading/accent mistake. [Pinned synthesis](https://raw.githubusercontent.com/VOICEVOX/voicevox_nemo_engine/0.24.0/voicevox_engine/tts_pipeline/tts_engine.py)

Produce two or three targeted variants per rejected word, preserving the exact query, parameter change, narrator/version, WAV, and hash. Let the native listener choose or describe the remaining defect. After two or three unsuccessful adjustment passes, compare another narrator or record a human exception. Keep accepted recordings fixed rather than regenerating the entire catalogue. This is a bounded editorial process, not a promise that unlimited retries will yield a perfect clip.

File/signal checks can reject silence, clipping, missing files, and malformed output. Reading/mora checks can reject known input errors. Neither supplies listening approval. Keep Nemo audio outside ASR or other ML evaluation: its output terms prohibit machine-learning use without clarifying an inference-only exception. [Output terms](https://voicevox.hiroshiba.jp/nemo/term/)

## Candidates compared

| Route | Practical fit | Rights/publication | Evidence here |
|---|---|---|---|
| **VOICEVOX Nemo, Female 1 or Male 1** | Small self-contained Windows CPU package; Japanese reading/accent editing. | Follow its output-specific terms and preserve required credit; see [usage notice](./audio/candidates/nemo/OUTPUT_TERMS.md). | Successfully run here; 32 samples available for listening. |
| **Qwen3-TTS-12Hz-0.6B-CustomVoice, Ono_Anna** | Japanese fixed voice, no reference/voice cloning needed; approximately 2.5 GB model/tokenizer package. GPU-oriented setup is heavier. | Model/code declared Apache-2.0. No extra voice-output restriction identified in the checked official card; that is not a blanket rights guarantee. | Official documentation checked; not installed, benchmarked, or auditioned here. |
| **MeloTTS-Japanese, JP** | CPU supported. 208 MB voice checkpoint plus roughly 447 MB Japanese BERT, dictionary and runtime. Official Windows guidance prefers Docker. | Code/JP weights declared MIT; BERT Apache-2.0. No additional output restriction found in the checked sources. | Documentation checked; not installed or auditioned here. |
| **Original native-speaker word bank** | Exact 60-word scope, one voice, sense-specific retakes. No model needed at authoring or runtime. | Explicit recording/performance permission and chosen reuse license are essential. Could be free if a consenting volunteer is available. | A practical alternative, not an acquired recording service. |

Sources: [Qwen model](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice), [Qwen official implementation](https://github.com/QwenLM/Qwen3-TTS), [Melo Japanese model](https://huggingface.co/myshell-ai/MeloTTS-Japanese), [Melo installation](https://github.com/myshell-ai/MeloTTS/blob/main/docs/install.md), [Japanese BERT](https://huggingface.co/tohoku-nlp/bert-base-japanese-v3).

The official Qwen feature table distinguishes the 0.6B model from larger instruction-controlled variants. Use `language="Japanese"`, fixed `Ono_Anna`, and do not depend on emotion instructions for that variant. The official material does not supply a universal minimum VRAM guarantee; the host GPU makes this a reasonable second candidate, not a tested deployment.

For this bounded game, Nemo's successful lightweight CPU test and pronunciation controls are more useful than downloading several large systems before hearing any result. Qwen is the next candidate if Nemo's sound or output terms do not suit the project.

## Commercial publication assessment

Nemo provides an explicit commercial/noncommercial grant for generated speech with credit. The installed Female 1 and Male 1 policies specify **VOICEVOX Nemo**. Applying this general commercial permission to selling the educational game or paid in-game content is a reasonable interpretation. The checked output terms list no royalty, revenue threshold, or separate commercialization application; an initially free release does not impose a noncommercial-only license. Use an accessible game About/Credits screen and credit trailers separately if they include the speech. Keep the output notice and checked terms/date with release provenance. [Nemo output terms](https://voicevox.hiroshiba.jp/nemo/term/), [official credit guidance](https://voicevox.hiroshiba.jp/qa/)

The speech terms also impose attribution, ML, content, and third-party-rights conditions and permit publication-stop requests in specified circumstances. They disclaim pronunciation/suitability guarantees. Shipping only generated WAVs avoids redistributing the engine; its LGPL/alternative source licensing is a separate question if that architecture changes. No inspected output term requires making the game source public. [Pinned engine license](https://raw.githubusercontent.com/VOICEVOX/voicevox_nemo_engine/0.24.0/LICENSE)

Qwen's official 0.6B CustomVoice weights, speech tokenizer, and code are declared **Apache-2.0**. Commercial use of those licensed components is permitted without model-license royalties or copyleft. In the checked official cards, README, license, and technical report, no additional output royalty, noncommercial restriction, or special Ono_Anna credit requirement was identified. There is also no separate express voice/output clearance warranty. Treating ordinary vocabulary WAVs as separate output is an interpretation; the model license does not automatically assign ownership of speech or guarantee performer/third-party rights. Retain licenses/notices if redistributing Qwen code or weights. [Model card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice), [tokenizer](https://huggingface.co/Qwen/Qwen3-TTS-Tokenizer-12Hz), [code license](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/LICENSE), [official report](https://arxiv.org/html/2601.15621v1)

For the clearest documented output permission today, Nemo is the stronger choice if its speech passes native review. Neither license is a blanket guarantee against every copyright or voice-rights dispute. Do not use Nemo WAVs as Qwen voice-cloning references: that would introduce ML use of Nemo output.

## Qwen retakes and host feasibility

The specific candidate is **Qwen3-TTS-12Hz-0.6B-CustomVoice**, using `language="Japanese"` and the fixed Japanese preset `Ono_Anna`. It remains uninstalled and unauditioned here; the native listener's preference concerns Nemo versus Kokoro, not Qwen.

The official API exposes sampling controls including `do_sample`, `temperature`, `top_k`, and `top_p`, plus separate `subtalker_*` controls. With sampling enabled, new random states can produce alternative takes. Log the seed, text, model revision, speaker, and both sets of generation parameters. A fresh take can improve a particular clip, but repeated sampling does not guarantee correct accent, mora lengths, or naturalness. Use a bounded three-to-five-take comparison and native approval. Turning off both sampling switches removes this deliberate variation; it does not establish better pronunciation. **The 0.6B API explicitly ignores `instruct`**, so do not promise textual commands for speaking rate/emotion. The 1.7B CustomVoice supports instruction control. [Official inference implementation](https://github.com/QwenLM/Qwen3-TTS/blob/main/qwen_tts/inference/qwen3_tts_model.py)

Measured host snapshot on 2026-10-08:

| Resource | Observed | Assessment for the 0.6B candidate |
|---|---|---|
| CPU | Intel Core i7-13620H | GPU authoring is the intended first route. |
| GPU | RTX 5060 Laptop, 8,151 MiB total VRAM; 7,733 MiB free | A one-word batch in BF16 is plausible; actual peak memory is unmeasured. |
| RAM | 15.64 GiB physical; 1.16 GiB available, 92% occupied | Recover several GiB by closing heavy applications before loading; current free RAM offers little margin. |
| Disk C: | 44.90 GiB free, equivalent to 48.21 decimal GB | Enough for one controlled model/environment installation under the budget below. |
| Driver | NVIDIA 592.82 | Compatible with the documented CUDA 13.0 Windows driver floor of 580.88; the complete Qwen environment is not validated. |

Published repository sizes are **2.50 decimal GB** for the complete 0.6B package and **4.52 GB** for 1.7B CustomVoice. The smaller package includes its **682 MB speech tokenizer**; do not add a duplicate tokenizer download. Its main weight file is 1.81 GB. These are model file sizes, not the Python/CUDA environment or inference-memory requirement. [0.6B files](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice/tree/main), [1.7B files](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice/tree/main)

**Planning estimate, not an installed measurement or official requirement:** allow roughly **8–12 GiB persistent storage** for Python, the expanded PyTorch CUDA runtime, dependencies, and one 0.6B package; reserve **10–15 GiB during installation** if package caching is disabled and weights are kept in one location. With caches/duplicate copies, allow **15–20 GiB**. These budgets exclude a full CUDA Toolkit, compilers, Docker/WSL, and FlashAttention builds. The existing 44.90 GiB free is sufficient for this test; storage is not the present primary obstacle.

Use Python 3.12 in an isolated authoring environment, a PyTorch/torchaudio CUDA build supporting this Blackwell GPU, BF16, batch size one, and `attn_implementation="sdpa"`. Qwen's model implementation declares SDPA support, avoiding a FlashAttention compilation requirement on Windows. PyTorch's official Blackwell support began with CUDA 12.8 in version 2.7; later CUDA 13.0 Windows builds are available. Verify GPU availability and an actual tiny inference before declaring installation successful. [Qwen setup](https://github.com/QwenLM/Qwen3-TTS), [SDPA implementation](https://github.com/QwenLM/Qwen3-TTS/blob/main/qwen_tts/core/models/modeling_qwen3_tts.py), [Blackwell support](https://pytorch.org/blog/pytorch-2-7/), [CUDA 13.0 driver requirement](https://pytorch.org/blog/pytorch-2-12-release-blog/)

No universal official minimum VRAM was found. The 0.6B package has substantially more headroom on this 8 GB GPU than 1.7B; start with 0.6B and measure peak VRAM/RAM, elapsed time, and native-reviewed word quality. This is a viable experiment, not a benchmark or a promise that Qwen will sound better than Nemo. The model runs only during asset authoring: the published game still loads ordinary static audio files.

## Creative alternative: human recordings

The original [Tofugu/WaniKani vocabulary recordings](https://github.com/tofugu/japanese-vocabulary-pronunciation-audio) are a real free word-level source, released under **CC BY-SA 4.0**. The repository distinguishes a professional native male Tokyo-accent voice from a native female Kansai-accent voice. Commons visibly contains at least 17 matches for this seed, but complete 60-word coverage and listening quality have not been established. [Commons catalogue](https://commons.wikimedia.org/wiki/Category:Japanese_vocabulary_pronunciation_from_WaniKani_and_Tofugu)

This option trades synthesis risk for attribution/ShareAlike handling, possible voice/accent mixing, and source coverage work. Do not promise that ShareAlike could only affect a WAV and never an interactive audiovisual presentation: the license explicitly addresses sound synchronized with moving images. [CC BY-SA legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en), [collection guidance](https://creativecommons.org/faq/#if-i-create-a-collection-that-includes-a-work-offered-under-a-cc-license-which-licenses-may-i-choose-for-the-collection)

A native volunteer recording the exact list is simpler for voice consistency. Prepare each sense ID, written form, kana, meaning, and two takes. Document permission for commercial/noncommercial game and repository distribution, editing/transcoding, and the desired attribution. A recording copyright license alone is not a substitute for permission concerning the person's performance/voice. CC0 or CC BY 4.0 can be considered if the contributor chooses it; do not infer cloning/training consent. No person has been contacted or contracted. [CC0](https://creativecommons.org/publicdomain/zero/1.0/legalcode.en), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Options not selected

- **Anneli:** the model creator now states that training used visual-novel audio without manufacturer or performer authorization and that the weights were removed. An earlier license label does not resolve that provenance. [Creator's disclosure](https://huggingface.co/kaunista/style-bert-vits2-Anneli)
- **JSUT recordings:** official audio-use terms prohibit redistribution and restrict uses; the text's license is not the recording license. [Author's terms](https://sites.google.com/site/shinnosuketakamichi/publication/jsut)
- **Forvo:** free access is not a free commercial reuse grant; current commercial API plans are paid. [License](https://forvo.com/license/), [plans](https://api.forvo.com/plans-and-pricing/)
- **Tsukuyomi-chan / some COEIROINK or corpus options:** their output/recording terms can add attribution, redistribution, and content constraints. Do not assume a permissive code license makes a freely reusable audio bank. [Tsukuyomi-chan corpus terms](https://tyc.rei-yumesaki.net/material/corpus/), [COEIROINK terms](https://coeiroink.com/terms)

## Handoff

1. Preserve the native listener's preference for Nemo, identify the remaining problematic word IDs, and select a consistent narrator on actual sound quality.
2. Generate the complete catalogue with that voice using the documented candidate tool; correct any mismatched query reading explicitly.
3. Review all selected word clips by listening. Numerical checks, dictionary output, ASR, or model reputation cannot supply that approval.
4. Build a one-to-one selected runtime manifest, retain source/query/license/credit/review provenance, and apply the existing playback contract. Only approved assets enter normal learning playback.
5. Publish the game's static WAVs and attribution; the player does not install or run a model. Keep authoring engines and rejected/candidate files out of the runtime build.

This research supplies a tested local route and concrete audition material. The first complete native review approves 22 pilot recordings; final narrator choice, targeted retakes, and approval of the full 60-word catalogue remain pending. Free software does not imply unrestricted output rights or a guarantee of zero legal risk.
