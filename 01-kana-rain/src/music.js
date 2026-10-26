/* Title-screen music: a calm garden piece for koto and shakuhachi with water drops.
   It is synthesized live, so it loops without a seam and needs no audio file. */
(function (root) {
  'use strict';

  const OfflineContextClass = root.OfflineAudioContext || root.webkitOfflineAudioContext;
  const BEAT = 60 / 72, INTRO_BEATS = 8, LOOP_BEATS = 64;
  // About 30 dB under the pronunciations. A pronunciation lowers it further, and an
  // interface tone pushes it below that tone while it sounds; tests/music.browser.cjs
  // measures all three.
  const LEVEL = .034, DUCKING = Object.freeze({ speech: .3, effects: .16 });
  const LOOKAHEAD = .6, TICK_MS = 120, FADE_IN = 2.5;
  const FADE_OUT = Object.freeze({ mute: .05, hidden: .12, menu: .7 });
  const STRING_RATE = 32000;

  // Miyako-bushi on B (B C E F# G), as a koto in hirajoshi tuning plays it. The
  // interface tones (C, E, G) belong to the same scale.
  const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function frequency(note) {
    const [, letter, sharp, octave] = /^([A-G])(#?)(\d)$/.exec(note);
    return 440 * 2 ** ((STEPS[letter] + (sharp ? 1 : 0) + 12 * (+octave + 1) - 69) / 12);
  }
  const STRINGS = 'E3 F#3 G3 B3 C4 E4 F#4 G4 B4 C5 E5'.split(' ');
  const DROPS = 'G5 B5 E6 F#6'.split(' ');

  // Bars of "beat note beats [velocity]". a+b sound together; a>b presses the
  // string up to b (oshide).
  const ACCOMPANIMENT = {
    E: '0 E3+B3 4 .4, 2.5 B3 1.5 .28',
    C: '0 G3+C4 4 .38, 2.5 G3 1.5 .26',
    B: '0 F#3+B3 4 .38, 2.5 F#3 1.5 .26'
  };
  const CHORDS = 'EECBCBEEEBCEECBE';
  const KOTO = [
    '1 B4 1.5, 2.5 C5 .5, 3 B4 1', '0 G4 1, 1 F#4 1, 2 E4 2',
    '1 E4 .5, 1.5 F#4 .5, 2 G4 1, 3 B4 1', '0 C5 1.5, 1.5 B4 2.5',
    '0 E5 1.5, 1.5 C5 .5, 2 B4 1, 3 G4 1', '0 F#4 1, 1 G4 .5, 1.5 F#4 .5, 2 E4 2',
    '0 E5 1, 1 C5 .5, 1.5 B4 .5, 2 G4 1.5, 3.5 B4 .5', '0 F#4>G4 2, 2 E4 2',
    '', '', '', '',
    '0 B4 1, 1 C5 1, 2 E5 1.5, 3.5 C5 .5', '0 C5 1.5, 1.5 G4 .5, 2 E4 1, 3 G4 1',
    '0 B4 1, 1 G4 1, 2 F#4 1, 3 E4 1', '1 E4 3'
  ];
  const SHAKUHACHI = {
    8: '1 B4 2, 3 C5 1', 9: '0 B4 1, 1 G4 1, 2 F#4 2', 10: '.5 G4 1.5, 2 B4 1, 3 C5 1',
    11: '0 E5 2, 2 B4 2', 14: '2 F#4 1 .25, 3 E4 5 .25'
  };
  const TAIKO = { 0: [[0, .25]], 8: [[0, .45]], 9: [[0, .4]], 10: [[0, .4]], 11: [[0, .45], [2.5, .25]] };

  function bar(text, offset, kind) {
    return text ? text.split(',').map(token => {
      const [beat, note, beats, velocity] = token.trim().split(' ');
      const [pitch, bend] = note.split('>');
      return { at: offset + +beat, kind, notes: pitch.split('+'), bend, beats: +beats, velocity: velocity ? +velocity : kind === 'koto' ? .8 : .3 };
    }) : [];
  }
  const INTRO = [
    { at: 0, kind: 'sararin', strings: 11, velocity: .3 }, ...bar('2.5 B3 1.5 .28', 0, 'koto'), { at: 3, kind: 'drop', note: 'B5' },
    ...bar(ACCOMPANIMENT.E, 4, 'koto'), { at: 6.5, kind: 'drop', note: 'E6' }
  ];
  const LOOP = [];
  for (let index = 0; index < 16; index++) {
    const at = index * 4, accompaniment = bar(ACCOMPANIMENT[CHORDS[index]], at, 'koto');
    // The shakuhachi section opens with a sararin sweep that ends on its first note.
    if (index === 8) accompaniment[0] = { at, kind: 'sararin', strings: 9, velocity: .34 };
    else LOOP.push({ at, kind: 'drop' });
    LOOP.push(...accompaniment, ...bar(KOTO[index], at, 'koto'), ...bar(SHAKUHACHI[index], at, 'shakuhachi'),
      ...(TAIKO[index] || []).map(([beat, velocity]) => ({ at: at + beat, kind: 'taiko', velocity })));
  }
  LOOP.sort((a, b) => a.at - b.at);
  const flute = LOOP.filter(event => event.kind === 'shakuhachi');
  flute.forEach((event, index) => {
    const before = flute[index - 1], after = flute[index + 1];
    event.phrase = !before || before.at + before.beats < event.at - .01;
    event.tied = !!after && event.at + event.beats >= after.at - .01;
  });

  const BUSES = {
    koto: { filters: [['peaking', 240, 2, .9], ['lowpass', 6500]], pan: -.12, dry: 1, wet: .3 },
    shakuhachi: { filters: [['lowpass', 3200]], pan: .2, dry: .8, wet: .5 },
    taiko: { filters: [['lowpass', 900]], pan: 0, dry: .9, wet: .25 },
    drop: { filters: [['highpass', 400]], pan: 0, dry: .45, wet: .85 }
  };
  const graphs = new WeakMap(), watched = new WeakSet();
  let current = null;

  function generator(seed) {
    return () => {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noise(context, seconds, seed) {
    const buffer = context.createBuffer(1, Math.round(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0), random = generator(seed);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
    return buffer;
  }
  // A garden-sized room: darkening stereo noise with a 2.2 s decay.
  function impulse(context) {
    const rate = context.sampleRate, length = Math.round(rate * 2.4), buffer = context.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel), random = generator(11 + channel), delay = Math.round(rate * .012);
      let low = 0;
      for (let i = delay; i < length; i++) {
        const t = (i - delay) / rate;
        low += (.85 - .3 * t) * (random() * 2 - 1 - low);
        data[i] = low * Math.exp(-6.9 * t / 2.2);
      }
    }
    return buffer;
  }
  function graphFor(context) {
    let graph = graphs.get(context);
    if (graph) return graph;
    const master = context.createGain(), speech = context.createGain(), effects = context.createGain(), reverb = context.createConvolver();
    master.gain.value = LEVEL;
    reverb.buffer = impulse(context);
    reverb.connect(master);
    master.connect(speech);
    speech.connect(effects);
    effects.connect(context.destination);
    const wave = context.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, .3, .12, .07, .03]));
    graph = { context, master, speech, effects, reverb, wave, air: noise(context, 2, 3), strings: new Map(), speaking: false };
    graphs.set(context, graph);
    return graph;
  }

  // Karplus-Strong koto strings, rendered once per pitch. The pluck is excited near
  // the bridge, which gives the bright, nasal attack; playback rate corrects tuning.
  function string(graph, note) {
    let entry = graph.strings.get(note);
    if (entry) return entry;
    const f = frequency(note), rate = STRING_RATE, stretch = Math.min(.5, Math.max(.15, 80 / f));
    const period = Math.max(2, Math.round(rate / f - stretch)), tuned = rate / (period + stretch);
    // Decay is the 60 dB time; the buffer stops near -48 dB.
    const decay = 2 + 450 / f, length = Math.round(rate * decay * .8);
    const buffer = graph.context.createBuffer(1, length, rate), y = buffer.getChannelData(0);
    const random = generator(Math.round(f * 100)), pick = Math.max(1, Math.round(period * .14)), excitation = new Float32Array(period);
    let low = 0, mean = 0, peak = 0;
    for (let i = 0; i < period; i++) { low += .5 * (random() * 2 - 1 - low); excitation[i] = low; }
    for (let i = 0; i < period; i++) { y[i] = excitation[i] - (i >= pick ? excitation[i - pick] : 0); mean += y[i] / period; }
    for (let i = 0; i < period; i++) y[i] -= mean;
    const loss = 10 ** (-3 / (tuned * decay));
    y[period] = loss * y[0];
    for (let i = period + 1; i < length; i++) y[i] = loss * ((1 - stretch) * y[i - period] + stretch * y[i - period - 1]);
    // The ivory plectrum's click.
    for (let i = 0; i < 64; i++) y[i] += .12 * (random() * 2 - 1) * (1 - i / 64);
    // Scale to the ringing string, softly limit the noisier first periods to half
    // above it, and fade out so the buffer never ends abruptly.
    const settled = Math.min(length, period * 3);
    for (let i = settled; i < Math.min(length, settled + rate * .05); i++) peak = Math.max(peak, Math.abs(y[i]));
    const fade = Math.round(rate * .08);
    for (let i = 0; i < length; i++) {
      const x = y[i] / peak, size = Math.abs(x);
      y[i] = (size > 1 ? Math.sign(x) * (1 + .5 * Math.tanh((size - 1) / .5)) : x) * Math.min(1, (length - i) / fade);
    }
    entry = { buffer, rate: f / tuned };
    graph.strings.set(note, entry);
    return entry;
  }

  function voice(session, source, start, stop, nodes, offset) {
    session.voices.add(source);
    source.onended = () => {
      session.voices.delete(source);
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
    if (offset === undefined) source.start(start);
    else source.start(start, offset);
    if (stop !== undefined) source.stop(stop);
  }
  function koto(session, time, note, velocity, event) {
    const context = session.context, { buffer, rate } = string(session.graph, note);
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(rate, time);
    if (event?.bend) {
      const pressed = time + event.beats * BEAT * .4;
      source.playbackRate.setValueAtTime(rate, pressed);
      source.playbackRate.linearRampToValueAtTime(rate * frequency(event.bend) / frequency(note), pressed + .16);
    }
    gain.gain.value = velocity;
    source.connect(gain);
    gain.connect(session.buses.koto);
    voice(session, source, time, undefined, [gain]);
  }
  // A breathy bamboo flute: each phrase scoops up from below (meri to kari), and
  // long notes grow a slow yuri vibrato.
  function shakuhachi(session, time, event) {
    const context = session.context, f = frequency(event.notes[0]), level = event.velocity;
    const length = event.beats * BEAT, end = time + length, attack = event.phrase ? .22 : .07, release = event.tied ? .09 : .4;
    const tone = context.createOscillator(), body = context.createGain();
    const air = context.createBufferSource(), band = context.createBiquadFilter(), breath = context.createGain();
    tone.setPeriodicWave(session.graph.wave);
    tone.frequency.value = f;
    tone.detune.setValueAtTime(event.phrase ? -80 : -20, time);
    tone.detune.setTargetAtTime(0, time + .02, event.phrase ? .08 : .025);
    body.gain.setValueAtTime(0, time);
    body.gain.linearRampToValueAtTime(level * .85, time + attack);
    body.gain.linearRampToValueAtTime(level, time + Math.max(attack + .01, length * .45));
    body.gain.linearRampToValueAtTime(level * .75, end);
    body.gain.linearRampToValueAtTime(0, end + release);
    air.buffer = session.graph.air;
    air.loop = true;
    band.type = 'bandpass';
    band.frequency.value = f * 2;
    band.Q.value = 1.4;
    breath.gain.setValueAtTime(0, time);
    breath.gain.linearRampToValueAtTime(level * (event.phrase ? .55 : .3), time + attack * .6);
    breath.gain.linearRampToValueAtTime(level * .12, time + Math.min(length * .8, attack + .25));
    breath.gain.linearRampToValueAtTime(0, end + release);
    tone.connect(body);
    body.connect(session.buses.shakuhachi);
    air.connect(band);
    band.connect(breath);
    breath.connect(session.buses.shakuhachi);
    if (length > 1.2) {
      const lfo = context.createOscillator(), depth = context.createGain();
      lfo.frequency.value = 4.6;
      depth.gain.setValueAtTime(0, time + length * .45);
      depth.gain.linearRampToValueAtTime(14, end);
      lfo.connect(depth);
      depth.connect(tone.detune);
      voice(session, lfo, time, end + release, [depth]);
    }
    voice(session, tone, time, end + release + .02, [body]);
    voice(session, air, time, end + release + .02, [band, breath], session.random() * 1.5);
  }
  function taiko(session, time, velocity) {
    const context = session.context, skin = context.createOscillator(), gain = context.createGain();
    const strike = context.createBufferSource(), thump = context.createGain();
    skin.frequency.setValueAtTime(150, time);
    skin.frequency.exponentialRampToValueAtTime(70, time + .2);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(velocity, time + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .9);
    strike.buffer = session.graph.air;
    thump.gain.setValueAtTime(velocity * .5, time);
    thump.gain.exponentialRampToValueAtTime(.0001, time + .07);
    skin.connect(gain);
    gain.connect(session.buses.taiko);
    strike.connect(thump);
    thump.connect(session.buses.taiko);
    voice(session, skin, time, time + .95, [gain]);
    voice(session, strike, time, time + .08, [thump], session.random() * 1.5);
  }
  // Suikinkutsu: a drop falling into a buried jar rings like a small bell.
  function drop(session, time, note, velocity, pan) {
    const context = session.context, f = frequency(note);
    let output = session.buses.drop;
    const panner = context.createStereoPanner?.();
    if (panner) { panner.pan.value = pan; panner.connect(output); output = panner; }
    [[1, 1, 1.8], [2.76, .16, .6], [5.4, .05, .25]].forEach(([ratio, level, decay], index) => {
      const tone = context.createOscillator(), gain = context.createGain();
      tone.frequency.setValueAtTime(f * ratio * 1.05, time);
      tone.frequency.exponentialRampToValueAtTime(f * ratio, time + .04);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(velocity * level, time + .004);
      gain.gain.exponentialRampToValueAtTime(.0001, time + decay);
      tone.connect(gain);
      gain.connect(output);
      voice(session, tone, time, time + decay + .02, index === 0 && panner ? [gain, panner] : [gain]);
    });
  }
  function play(session, event, time, random) {
    if (event.kind === 'koto') {
      // Slightly human timing and touch; a dyad is struck as a quick roll.
      const late = (random() - .5) * .016, touch = .94 + random() * .12;
      event.notes.forEach((note, index) => koto(session, time + late + index * .025, note, event.velocity * touch, event));
    } else if (event.kind === 'sararin') {
      for (let index = 0; index < event.strings; index++) koto(session, time + index * .06, STRINGS[index], event.velocity * (.7 + .3 * index / event.strings));
    } else if (event.kind === 'shakuhachi') shakuhachi(session, time, event);
    else if (event.kind === 'taiko') taiko(session, time, event.velocity);
    else if (event.note) drop(session, time, event.note, .22, .3);
    else if (random() < .45) drop(session, time + (Math.floor(random() * 4) + .5) * BEAT, DROPS[Math.floor(random() * DROPS.length)], .14 + random() * .12, random() * 1.2 - .6);
  }

  function bus(session, { filters, pan, dry, wet }) {
    const context = session.context, input = context.createGain(), send = context.createGain(), direct = context.createGain();
    let last = input;
    for (const [type, cutoff, gain = 0, q = .7] of filters) {
      const filter = context.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = cutoff;
      filter.gain.value = gain;
      filter.Q.value = q;
      last.connect(filter);
      last = filter;
    }
    const panner = pan ? context.createStereoPanner?.() : null;
    if (panner) { panner.pan.value = pan; last.connect(panner); last = panner; }
    direct.gain.value = dry;
    send.gain.value = wet;
    last.connect(direct);
    last.connect(send);
    direct.connect(session.dry);
    send.connect(session.wet);
    return input;
  }
  function createSession(graph, start) {
    const context = graph.context;
    const session = { context, graph, start, random: generator(5), voices: new Set(), timer: 0, list: INTRO, index: 0, base: 0, cycle: -1 };
    session.dry = context.createGain();
    session.wet = context.createGain();
    for (const node of [session.dry, session.wet]) {
      node.gain.setValueAtTime(0, start);
      node.gain.linearRampToValueAtTime(1, start + FADE_IN);
    }
    session.dry.connect(graph.master);
    session.wet.connect(graph.reverb);
    session.buses = Object.fromEntries(Object.entries(BUSES).map(([name, options]) => [name, bus(session, options)]));
    return session;
  }
  // The intro plays once; the loop then repeats on exact multiples of its length.
  function schedule(session, until) {
    const floor = session.context.currentTime - .03;
    for (;;) {
      if (session.index === session.list.length) {
        session.list = LOOP;
        session.index = 0;
        session.cycle++;
        session.base = INTRO_BEATS + session.cycle * LOOP_BEATS;
      }
      const event = session.list[session.index], time = session.start + (session.base + event.at) * BEAT;
      if (time > until) return;
      if (time >= floor) play(session, event, time, generator(session.cycle * 1009 + session.index + 7));
      session.index++;
    }
  }

  function tick() {
    const session = current;
    if (!session) return;
    const graph = session.graph, now = session.context.currentTime, speaking = !!root.KanaAudio?.playing;
    if (speaking !== graph.speaking) {
      graph.speaking = speaking;
      graph.speech.gain.setTargetAtTime(speaking ? DUCKING.speech : 1, now, speaking ? .03 : .3);
    }
    schedule(session, now + LOOKAHEAD);
    session.timer = root.setTimeout(tick, TICK_MS);
  }
  // KanaSfx calls this as it starts a tone lasting the given seconds.
  function duck(seconds) {
    const graph = current?.graph;
    if (!graph) return;
    const now = graph.context.currentTime, gain = graph.effects.gain;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(DUCKING.effects, now, .003);
    gain.setTargetAtTime(1, now + seconds, .12);
  }
  function stop(fade) {
    const session = current;
    if (!session) return;
    current = null;
    root.clearTimeout(session.timer);
    const now = session.context.currentTime;
    for (const node of [session.dry, session.wet]) {
      const gain = node.gain;
      if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
      else { const value = gain.value; gain.cancelScheduledValues(now); gain.setValueAtTime(value, now); }
      gain.linearRampToValueAtTime(0, now + fade);
    }
    root.setTimeout(() => {
      session.voices.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
      session.dry.disconnect();
      session.wet.disconnect();
    }, (fade + .05) * 1000);
  }
  // Plays only on the title screen, with sound on, in a visible tab, after a gesture
  // has given KanaSfx a running audio context.
  function sync() {
    const blocked = !root.KanaAudio?.enabled ? 'mute' : document.hidden ? 'hidden' : document.body?.classList.contains('is-menu') ? null : 'menu';
    if (blocked) { stop(FADE_OUT[blocked]); return false; }
    const context = root.KanaSfx?.context;
    if (current && current.context === context) return true;
    stop(FADE_OUT.hidden);
    if (!context) return false;
    if (context.state !== 'running') {
      // The first gesture resumes the context asynchronously.
      if (!watched.has(context)) { watched.add(context); context.addEventListener?.('statechange', sync); }
      return false;
    }
    current = createSession(graphFor(context), context.currentTime + .1);
    tick();
    return true;
  }
  function render(seconds = (INTRO_BEATS + LOOP_BEATS) * BEAT, sampleRate = 48000) {
    const context = new OfflineContextClass(2, Math.ceil(seconds * sampleRate), sampleRate);
    schedule(createSession(graphFor(context), 0), seconds);
    return context.startRendering();
  }

  // Registered after KanaSfx, so its context already exists for this gesture.
  document.addEventListener('pointerdown', sync, { capture: true, passive: true });
  document.addEventListener('keydown', sync, { capture: true, passive: true });
  document.addEventListener('visibilitychange', sync);

  root.KanaMusic = Object.freeze({
    sync,
    duck,
    render,
    get playing() { return !!current; },
    ducking: DUCKING,
    timing: Object.freeze({ beat: BEAT, intro: INTRO_BEATS * BEAT, loop: LOOP_BEATS * BEAT })
  });
})(window);
