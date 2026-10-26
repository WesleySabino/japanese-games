# Menu music provenance

The title screen plays a calm garden piece for koto and shakuhachi, with a light taiko and water drops. There is no audio file: `src/music.js` holds the score and synthesizes every sound with the Web Audio API while the menu is open. No recording, sample, sound font, generated-music service or third-party composition is used, so nothing is downloaded and the piece is cached offline with the game code. It is released as CC0-1.0 (`LICENSE-MUSIC.txt`).

The piece was composed and implemented for the project with Claude Code (Anthropic) on 2026-10-25, at the project's request. Listener review is pending: like the pronunciations, it needs a person to approve it before release.

## Score

- **Scale:** miyako-bushi on B (B C E F♯ G), the in scale, as a koto in hirajoshi tuning plays it. The strings used are E3 F♯3 G3 B3 C4 E4 F♯4 G4 B4 C5 E5. The interface tones (C, E, G) belong to the same scale, so a button cue never clashes with the music.
- **Tempo and length:** 72 beats per minute in 4/4. A two-bar intro (6.7 s) plays once; the 16-bar loop (53.3 s) then repeats.
- **Form:** bars 1–8, koto melody over slow low dyads; bars 9–12, a sararin sweep across the strings hands the melody to the shakuhachi, with a soft taiko on each downbeat; bars 13–16, the koto returns and the shakuhachi joins the closing cadence on E.
- **Ornaments:** oshide (pressing a koto string to raise it a semitone), rolled dyads, a meri-to-kari scoop at the start of each shakuhachi phrase and a slow yuri vibrato on long notes. Space between phrases (ma) is part of the score.

## Synthesis

- **Koto:** Karplus-Strong plucked strings, rendered once per pitch on first use (mono, 32 kHz, about 4 MB in memory for all strings). The pluck is excited near the bridge for the bright, nasal attack, with a short plectrum click. Low strings ring for about 4.7 s, high ones for about 2.7 s. Playback rate corrects tuning and performs the oshide bends.
- **Shakuhachi:** a periodic wave with weak upper harmonics plus band-passed breath noise, with stronger breath at phrase starts.
- **Taiko:** a falling 150 → 70 Hz tone with a short noise thump, kept low.
- **Water drops (suikinkutsu):** small bells with inharmonic partials (1, 2.76 and 5.4 times the pitch) in G5–F♯6. Each loop places them anew from a fixed seed, and koto timing and touch vary slightly per cycle, so repeats are not mechanical.
- **Space:** a generated 2.4 s stereo impulse response (darkening noise, 2.2 s decay) through a convolver.

## Looping and playback

The notes are scheduled from the audio clock, 0.6 s ahead. Each cycle starts at an exact multiple of the loop length after the intro, and notes from one cycle ring into the next, so there is no file seam, gap or click. `tests/music.test.cjs` checks that every cycle repeats the score at the same offsets. `tests/music.browser.cjs` renders two cycles and checks the loop joins.

The music plays only on the title screen and only after the player's first tap, click or key, because browsers require a gesture before audio starts. It shares the interface tones' audio context, follows the sound button and stops when the tab is hidden. It fades in over 2.5 s and fades out in 0.7 s when the rain starts or 0.05 s when muted.

## Levels

Measured on an offline render with `ffmpeg -af ebur128` and in `tests/music.browser.cjs`:

- The music is about −46 LUFS integrated, with peaks near −30 dBFS. A pronunciation such as `ka.mp3` is about −15 LUFS, so the music sits about 31 dB below the recordings.
- While a pronunciation plays, the music drops by about 10 dB (×0.3).
- While an interface tone plays, the music drops by 16 dB (×0.16) for the tone's length. Its peaks (about −45.6 dBFS) then stay below the tones' peaks (−40.5 to −40.9 dBFS), and its loudest 75 ms (about −57 dBFS) below the quietest tone (−55 dBFS).

`LEVEL` and `DUCKING` in `src/music.js` set these values.

## Listening outside the game

In the browser console on the game page, `await KanaMusic.render(60)` returns an `AudioBuffer` of the intro and first loop from an `OfflineAudioContext`. The render uses the same score and levels as the game.

## Licence

CC0-1.0 for the composition and the sound it produces. See `LICENSE-MUSIC.txt`.
