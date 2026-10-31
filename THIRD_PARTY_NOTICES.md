# License and asset notices

The repository's [MIT License](LICENSE) covers project source code,
documentation, and original artwork, except material with a separate notice.
Keep those separate notices when copying or distributing the affected material.

| Material | Terms and provenance |
| --- | --- |
| Game source, scripts, tests, and documentation | MIT. |
| Original Kana Rain artwork and its derived game images | MIT. The AI-generated source artwork and generation prompts are retained in [assets/PROMPTS.md](01-kana-rain/assets/PROMPTS.md). |
| Pronunciation recordings in `kana-audio-bundle/audio/` | CC0-1.0; see the [audio notice](01-kana-rain/kana-audio-bundle/LICENSE-AUDIO.txt) and [provenance](01-kana-rain/kana-audio-bundle/PROVENANCE.md). |
| Imported audio-bundle metadata, documentation, and example code | MIT with the existing [Japanese Core contributors' notice](01-kana-rain/kana-audio-bundle/LICENSE-MIT.txt). Retain that copyright notice. |
| Kana Rain menu composition and synthesized sound | CC0-1.0; see the [music notice](01-kana-rain/music/LICENSE-MUSIC.txt) and [provenance](01-kana-rain/music/PROVENANCE.md). The synthesizer source `src/music.js` is MIT. |
| Development dependencies and their bundled components | Their respective licenses apply. Consult the packages' notices and the pinned lockfile. Development packages are not included in the static game build. |

The audio generator's models, voice packs, and runtime are not distributed with
the game. Their upstream license information remains in the audio provenance
and manifests; the recordings' CC0 notice is preserved separately.

Future games inherit the repository's MIT terms for original contributions.
Document any separately licensed material alongside that game's assets and add
it to this index. Do not remove or relabel upstream notices.
