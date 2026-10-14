/* Soft interface tones complement the recorded pronunciations without changing KanaAudio. */
(function (root) {
  'use strict';

  const AudioContextClass = root.AudioContext || root.webkitAudioContext;
  const cues = Object.freeze({
    menu: [[659, 0, .075]],
    start: [[523, 0, .07], [659, .055, .075], [784, .115, .12]],
    back: [[523, 0, .065], [392, .055, .085]],
    confirm: [[659, 0, .065], [784, .055, .09]],
    tick: [[880, 0, .045]],
    heart: [[392, 0, .08], [294, .075, .12]],
    streak: [[784, 0, .075], [988, .065, .085], [1175, .13, .11]],
    record: [[659, 0, .08], [784, .07, .08], [988, .14, .1], [1319, .23, .15]],
    unlock: [[523, 0, .08], [659, .065, .08], [784, .13, .09], [1047, .205, .16]],
    warning: [[392, 0, .06], [392, .105, .06]]
  });
  let context = null, output = null, resuming = null, unavailable = false;
  let lastKind = null, playCount = 0, lastMenuAt = -Infinity;
  const voices = new Set();
  const enabled = () => !!root.KanaAudio?.enabled;

  // Create/resume audio only in response to a gesture. Game events can then use
  // the running context, without deferred sounds waiting for a future gesture.
  function prime() {
    if (!AudioContextClass || unavailable) return;
    try {
      if (!context || context.state === 'closed') {
        context = new AudioContextClass();
        output = context.createGain();
        output.gain.value = .3;
        output.connect(context.destination);
      }
      if (context.state !== 'running' && !resuming) {
        resuming = Promise.resolve(context.resume()).catch(() => false)
          .finally(() => { resuming = null; });
      }
    } catch {
      unavailable = true;
    }
  }

  function silence() {
    if (!context) return;
    const now = context.currentTime;
    voices.forEach(voice => {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(.0001, now, .003);
        voice.oscillator.stop(now + .015);
      } catch { /* A completed voice is already silent. */ }
    });
  }

  async function play(kind = 'menu') {
    if (!enabled() || !context || unavailable) return false;
    if (context.state !== 'running' && resuming) {
      // A browser that declines to unlock audio must not leave promises or old
      // interface tones waiting indefinitely.
      await Promise.race([resuming, new Promise(resolve => root.setTimeout(resolve, 80))]);
    }
    if (!enabled() || context.state !== 'running') return false;
    kind = Object.prototype.hasOwnProperty.call(cues, kind) ? kind : 'menu';
    const now = context.currentTime;
    if ((kind === 'menu' || kind === 'tick') && now - lastMenuAt < .035) return false;
    if (kind === 'menu' || kind === 'tick') lastMenuAt = now;

    // Pronunciation always takes priority. These short sine tones are quiet
    // even without the optional playing getter exposed by KanaAudio.
    const peak = root.KanaAudio?.playing ? .012 : .032;
    try {
      cues[kind].forEach(([frequency, delay, duration]) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = now + delay, finish = start + duration;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + .005);
        gain.gain.exponentialRampToValueAtTime(.0001, finish);
        oscillator.connect(gain);
        gain.connect(output);
        const voice = { oscillator, gain };
        voices.add(voice);
        oscillator.onended = () => {
          voices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(finish + .005);
      });
      lastKind = kind;
      playCount++;
      return true;
    } catch {
      silence();
      return false;
    }
  }

  function buttonCue(button) {
    if (['startBtn', 'againBtn', 'reviewPracticeBtn'].includes(button.id)) return 'start';
    if (button.id === 'resetBtn' || button.classList.contains('danger')) return 'warning';
    if (button.classList.contains('dialog-close') ||
      /^(close|back|return|cancel)/i.test(button.id)) return 'back';
    if (button.matches('[data-script]')) {
      return button.getAttribute('aria-pressed') === 'true' || button.classList.contains('selected') ? 'menu' : 'confirm';
    }
    if (['resumeBtn', 'saveSettings', 'finishBtn', 'exportBtn', 'submitBtn'].includes(button.id)) return 'confirm';
    return 'menu';
  }

  document.addEventListener('pointerdown', prime, { capture: true, passive: true });
  document.addEventListener('keydown', prime, { capture: true, passive: true });
  document.addEventListener('click', event => {
    prime();
    const button = event.target.closest?.('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.matches('[data-key]')) return;
    void play(buttonCue(button));
    // The capture listener sees the old mute state; stop any remaining notes
    // after the toggle's handler has applied its new state.
    if (button.id === 'soundBtn') root.queueMicrotask(() => { if (!enabled()) silence(); });
  }, true);
  document.addEventListener('change', event => {
    const select = event.target.closest?.('select');
    if (!select || select.disabled) return;
    void play('confirm');
  }, true);

  root.KanaSfx = Object.freeze({
    play,
    get lastKind() { return lastKind; },
    get playCount() { return playCount; }
  });
})(window);
