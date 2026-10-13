# Kana audio bundle

216 app items mapped to 112 original served MP3s, including basic and voiced
kana, yoon combinations, and the small-tsu/long-vowel example words.
Hiragana and katakana share files for the same reading. Audio bytes are
unchanged from the app, including the repaired standalone ん/ン recording.

## Files and lookup

- `audio/`: the MP3s used by the app; no TTS engine or app dependencies required.
- `manifest.json`: portable UTF-8 JSON with relative paths and SHA-256 checksums.
- `original-manifest.json`: byte-for-byte original provenance and review metadata.
- `PROVENANCE.md`: original technical documentation, retained as a source snapshot.
- `LICENSE-AUDIO.txt`: project audio notice (CC0-1.0).
- `LICENSE-MIT.txt`: license for project metadata, docs and example code.

All lookup values are file paths relative to the bundle root:

| Lookup | Example key | Example value |
| --- | --- | --- |
| `byKana` | `あ` or `ア` | `audio/a.mp3` |
| `byItemId` | `hiragana-あ` | `audio/a.mp3` |
| `byReading` | `a` | `audio/a.mp3` |
| `byAudioId` | `a` | `audio/a.mp3` |

`byKana` also accepts complete catalogue strings such as `きゃ`, `コーヒー`
and `がっこう`. It does not compose arbitrary strings or individual small kana.
`byReading` uses the app's canonical readings (for example `gakkoo`, `koohii`,
`di`, `du`, `wo`); accepted alternate spellings are in `items[].accepted`.
Keep homophone keys separate: `じ` and `ぢ` map to their own files.
`items` provides ID, symbol, script, kind, reading, typing, audio ID and path.
`recordings` provides checksum, byte size, generator processing, review status
and the item IDs/symbols sharing each recording. The source FLACs referenced
in provenance are not included; this pack contains the playback MP3s only.

## Browser example

Copy this entire directory into your app's static assets. Serve it over HTTP,
then resolve each path against the manifest URL (adjust the base to your app):

```js
const manifestUrl = new URL('/kana-audio/manifest.json', location.origin);
const response = await fetch(manifestUrl);
if (!response.ok) throw new Error('Could not load kana audio manifest');
const pack = await response.json();
const file = pack.byKana['キョ']; // audio/kyo.mp3
if (!file) throw new Error('Kana not included in this bundle');
await new Audio(new URL(file, manifestUrl).href).play(); // call on user gesture
```

For a native app, parse the same JSON and join the relative file path to the
unpacked bundle directory. No paths depend on the original repository.

## Provenance and review

The project declares the synthesized recordings CC0-1.0. The preserved
manifest describes Kokoro-82M v1.0, voice jf_tebukuro and its Apache-2.0
generator assets. Model weights and voice packs are not part of this bundle.
Review statuses are copied unchanged: approved entries have a provisional
approval note, and ん remains pending after its repair. Checksums confirm
integrity; extraction does not certify pronunciation.

## Original extraction procedure (external source project)

The following commands were supplied with the original export. They refer to
the source project's `destilacao-local/` workspace, which is not included in
this repository; they are provenance, not commands for this checkout.
That external extraction used Node 24+ and PowerShell:

```powershell
node destilacao-local/exportar-audios.mjs
Compress-Archive -LiteralPath destilacao-local/kana-audio-bundle -DestinationPath destilacao-local/kana-audio-bundle.zip -Force
```

The original generator read that source project's live catalogue and served
audio, rejected missing/mismatched files, and preserved their bytes. Rebuilding
its ZIP was a separate command. This repository serves the preserved bundle
directly and does not ship a synthesis engine or the external export script.

To validate this checkout's catalogue and bundled recordings, run `pnpm test`
inside `01-kana-rain/`; development setup is in the [game README](../README.md).
