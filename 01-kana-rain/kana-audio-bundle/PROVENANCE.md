# Kana recording provenance

Every sound the app plays is synthesized offline by the project with the open [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) text-to-speech model (v1.0, Apache-2.0) and its Japanese voice `jf_tebukuro`. There are 112 recordings, one per audio stem, and they cover all 216 catalogue items: 71 basic and voiced sounds, 33 yōon and 8 small-っ/long-vowel words. Hiragana and katakana share each file. No third-party recording is bundled; the pack is released as CC0-1.0. The app never synthesizes speech at run time and never uses a system voice.

`public/audio/manifest.json` (version 3) records the generator (model file and SHA-256, voice pack and SHA-256, voice, speed, runtime versions) and, per recording, the kana, its phonemes, the carrier phrase, the source and served SHA-256 and the listener-review status.

## How the pack is built

```sh
cd 30-app
npm run audio:generate   # plan → synthesize → normalize
npm run audio:check      # optional machine check (Whisper, ~1.6 GB model)
```

`audio:generate` needs [uv](https://docs.astral.sh/uv/) and ffmpeg. uv installs the pinned Python dependencies into its own cache; nothing is installed in the repository. It runs three steps:

1. `scripts/audio-plan.mjs` reads the kana catalogue and writes `audio-src/plan.json`: one entry per audio stem, with the kana to say (katakana words are converted to hiragana).
2. `tools/tts/generate.py` downloads the model files on first use from the [kokoro-onnx model-files-v1.1 release](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.1) into `%LOCALAPPDATA%/japanese-core/kokoro-v1.1` (or `~/.cache/…`; override with `JAPANESE_CORE_TTS_CACHE`) and checks their SHA-256. That release is an ONNX export of the v1.0 weights that also reports phoneme durations; the voice pack is byte-identical to v1.0. It writes `audio-src/<id>.flac` and `audio-src/generation.json`.
3. `scripts/normalize-audio.mjs` trims silence, normalizes each clip to −16 LUFS (two-pass EBU R128, −1.5 dBTP ceiling, sample-peak limiter), adds a 60 ms lead-in and writes mono 128 kbps MP3s and the manifest. A listener review is kept only for a byte-identical file.

Synthesis is not bit-reproducible: Kokoro's vocoder adds random noise, so every run produces slightly different files, and a full rebuild resets every listener review. To replace one sound, run `uv run tools/tts/generate.py --only <id>` and then `npm run audio:normalize`; the other files and their reviews stay as they are.

### Phonemes

`tools/tts/kana_ipa.py` converts kana directly to the IPA symbols Kokoro's Japanese voices were trained on (the mapping of misaki's cutlet G2P, Apache-2.0, adapted from cutlet, MIT). Converting directly, instead of through a dictionary, keeps each kana's own sound: a dictionary reads an isolated は as the particle "wa" and へ as "e". Long vowels follow the pronunciation (こう → koː, おかあさん → okaːsaɴ), っ is a closure (ʔ) and ん assimilates to the next consonant. Three deliberate changes from misaki, each found by back-transcription: /u/ is always written ɯ (misaki's ɨ after s, ts, z and in yōon is devoiced by Kokoro until す, つ, じゅ, にゅ, ひゅ are silent); yōon are written consonant + j + vowel (misaki's kʲa is spoken as two syllables, "ki-a"); and ちゃ is written with aspiration, ʨʰa (otherwise it comes out as じゃ).

### Carrier phrase and cut

Kokoro garbles utterances of one or two phonemes: an isolated "ka" comes out as "ga" or as noise, whatever the voice style. It says the same kana clearly at the end of a phrase. Each kana is therefore spoken at the end of つぎは。<kana>。 ("next: <kana>."), which also gives it a natural falling intonation, and cut out. The model's phoneme durations locate the kana. `jf_tebukuro` usually pauses before the kana, and the cut falls at the end of that silence. Otherwise the cut point is refined in the signal by the kind of first sound (closure of a stop, start of the dip for voiced stops and fricatives, quietest point of a nasal or flap, just before a vowel). Glides use a carrier that ends on the vowel they continue. The end is cut where voicing has faded by 25 dB, which drops the breathy release after a phrase-final vowel. The comments in `tools/tts/generate.py` give the details.

## Machine check

`npm run audio:check` back-transcribes every served file with Whisper large-v3-turbo (each clip played three times with pauses, as in a teacher's recording) and writes `audio-src/check.json`. It is a screening tool, not a pronunciation review. Whisper often writes an isolated syllable as a homophone kanji, a number or a Latin letter (きゅ as 9, しゅ as 手, し as "C"), splits a yōon into two syllables, or hallucinates on very short clips. A mismatch means "listen to this one first". `--only <ids>` rechecks some files and keeps the other rows.

Because synthesis varies from run to run, files the check flags can be regenerated with `generate.py --only <ids>` and rechecked; the pack was built this way on 2026-09-27, with up to three attempts per flagged file. For calibration, the same test matched 7 of 32 of the former human recordings.

Result for the current pack (2026-09-27, `audio-src/check.json`): 99 of 112 files match exactly. Six more are right in another spelling (学校, 切って, お母さん, 9 for きゅ, 妙 for みょ, は for わ) and ん alone cannot be transcribed. Listen first to the six Whisper hears differently: べっど (ベト), びょ (びよ), は (はっ), きゃ (ぎゃ), ぺ (て) and しゃ (消).

## Reviewing by ear

`npm run audio:review` writes `audio-src/review.html` (not committed), a page to open from disk that plays every file, shows what Whisper heard and lets the listener mark each file OK or "problem". It downloads `audio-review.json`; `node scripts/apply-audio-review.mjs audio-review.json "<name>"` records the approvals in the manifest (only for the exact file heard) and lists the flagged ids to regenerate.

## Listener review

The pronunciation of every file still needs a listener. After listening to a file, set its `review` to `{ "status": "approved", "by": "<name>", "at": "<date>" }` in the manifest. The release checklist requires every bundled file to be approved.

## Licences

- Kokoro-82M weights and voice pack: Apache-2.0 ([model card](https://huggingface.co/hexgrad/Kokoro-82M)). kokoro-onnx: MIT. onnxruntime: MIT. misaki mapping (adapted in `kana_ipa.py`): Apache-2.0; cutlet: MIT.
- The generated audio is released by the project under CC0-1.0.
- The tools used only to check audio (faster-whisper, MIT; Whisper weights, MIT) are not distributed with the app.

## History

### 2026-10-03: silent ん/ン recording repaired

The original `n.mp3` decoded to 11,466 entirely zero PCM samples, despite
matching its manifest checksum. Its source nasal was below the normalizer's
−50 dB silence threshold. The bare final `ɴ` in the short carrier yielded a
collapsed returned timing and an effectively silent extracted clip. All 111
other served recordings contained audible signal.

The same verified Kokoro model, Japanese voice and speed now synthesize the
standalone cue as sustained `ɴː` directly, without a carrier, added vowel or
changing contextual nasal assimilation in words. The new clip lasts about
0.50 seconds including lead-in/trailing silence. Its source and served hashes
are updated, and its listener approval is reset to pending. Signal checks are
not a human pronunciation review.

Generation rejects near-silent extracted clips; normalization decodes and
checks the resulting MP3 before replacing a recording. Regression tests decode
every served MP3 and reject an otherwise valid silent WAV. These tests require
ffmpeg, already required by `audio:normalize`. To repair only selected stems
without re-encoding the remaining pack, use `node scripts/normalize-audio.mjs
--only n`. The precache build ID changes when the audio bytes change, so the
normal app update installs a new audio cache without changing study data.

Up to 0.2.0-rc.1 the pack held 71 public-domain human recordings from Wikimedia Commons (basic and voiced sounds only), with no recording for yōon or the example words. They were replaced on 2026-09-27: learners found them robotic and hard to hear, they came from different speakers, and 74 items had no dictation. They remain in the Git history.
